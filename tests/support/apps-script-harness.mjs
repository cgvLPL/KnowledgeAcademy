// In-memory Apps Script runtime for behavioural backend tests.
//
// Loads the real google-apps-script/*.gs sources into a Node vm context with
// small fakes for SpreadsheetApp, LockService, CacheService,
// PropertiesService, Utilities and ContentService, plus a controllable clock.
// Only the API surface the backend uses is implemented.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SOURCES = {
  code: new URL("../../google-apps-script/Code.gs", import.meta.url),
  liveQuiz: new URL("../../google-apps-script/ZZLiveQuiz.gs", import.meta.url),
};

function chainable(target = {}) {
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === "then") return undefined;
      return () => chainable(target);
    },
  });
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.maxColumns = 26;
  }

  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.reduce((max, row) => Math.max(max, row.length), 0); }
  getMaxColumns() { return this.maxColumns; }
  insertColumnsAfter(_after, count) { this.maxColumns += count; }

  getRange(row, column, numRows = 1, numColumns = 1) {
    if (typeof row === "string") return chainable({ getValue: () => "" });
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  deleteRow(row) { this.deleteRows(row, 1); }
  deleteRows(row, count) {
    if (row < 2 || row + count - 1 > this.rows.length) {
      throw new Error(`deleteRows(${row}, ${count}) is out of range for ${this.name}`);
    }
    this.rows.splice(row - 1, count);
  }

  clear() { this.rows = []; }
  getCharts() { return []; }
  removeChart() {}
  setFrozenRows() {}
  setHiddenGridlines() {}
  setColumnWidth() {}
}

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    Object.assign(this, { sheet, row, column, numRows, numColumns });
    const proxy = new Proxy(this, {
      get(target, property) {
        if (property in target) return target[property];
        if (property === "then") return undefined;
        return () => proxy;
      },
    });
    this.proxy = proxy;
    return proxy;
  }

  getValues() {
    const values = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const source = this.sheet.rows[this.row - 1 + r] || [];
      const row = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        const value = source[this.column - 1 + c];
        row.push(value === undefined ? "" : value);
      }
      values.push(row);
    }
    return values;
  }

  setValues(values) {
    if (values.length !== this.numRows || values.some((row) => row.length !== this.numColumns)) {
      throw new Error("setValues dimensions do not match the range");
    }
    values.forEach((rowValues, r) => {
      const index = this.row - 1 + r;
      while (this.sheet.rows.length <= index) this.sheet.rows.push([]);
      rowValues.forEach((value, c) => { this.sheet.rows[index][this.column - 1 + c] = value; });
    });
    return this.proxy;
  }

  getValue() { return this.getValues()[0][0]; }
  setValue(value) { return this.setValues([[value]]); }

  createTextFinder(text) {
    const needle = String(text).toLowerCase();
    // Arrow functions keep this method's `this`, so no alias is needed.
    const matches = () => {
      const found = [];
      this.getValues().forEach((row, r) => {
        row.forEach((value) => {
          if (String(value).toLowerCase() === needle) found.push({ getRow: () => this.row + r });
        });
      });
      return found;
    };
    const finder = {
      matchEntireCell: () => finder,
      useRegularExpression: () => finder,
      matchCase: () => finder,
      findNext: () => matches()[0] || null,
      findAll: () => matches(),
    };
    return finder;
  }
}

class FakeSpreadsheet {
  constructor() { this.sheets = []; }
  getSheetByName(name) { return this.sheets.find((sheet) => sheet.name === name) || null; }
  insertSheet(name) {
    const sheet = new FakeSheet(name);
    this.sheets.push(sheet);
    return sheet;
  }
  getSheets() { return this.sheets.slice(); }
  setSpreadsheetTimeZone() {}
  getId() { return "test-spreadsheet"; }
}

/**
 * Creates a backend instance. `order` controls the file evaluation order so
 * tests can prove routing does not depend on it.
 */
export function createBackend({ order = ["code", "liveQuiz"], startAt = "2026-11-01T02:00:00.000Z" } = {}) {
  const clock = { now: Date.parse(startAt) };
  const spreadsheet = new FakeSpreadsheet();
  const properties = new Map([
    ["INITIAL_ADMIN_USERNAME", "admin"],
    ["INITIAL_ADMIN_PASSWORD", "admin-password"],
    ["INITIAL_ADMIN_NAME", "Admin"],
  ]);
  const cache = new Map();
  const stats = { lockAcquisitions: 0 };

  const RealDate = Date;
  class ClockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(clock.now);
      else super(...args);
    }
    static now() { return clock.now; }
  }

  const toSignedBytes = (buffer) => Array.from(buffer, (byte) => (byte > 127 ? byte - 256 : byte));

  const sandbox = {
    console: { log() {}, error() {}, warn() {} },
    Date: ClockDate,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
      flush() {},
      newDataValidation: () => chainable(),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock() { stats.lockAcquisitions += 1; return true; },
        waitLock() { stats.lockAcquisitions += 1; },
        releaseLock() {},
        hasLock: () => true,
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => (cache.has(key) ? cache.get(key) : null),
        put: (key, value) => { cache.set(key, String(value)); },
        remove: (key) => { cache.delete(key); },
        getAll: (keys) => Object.fromEntries(keys.filter((key) => cache.has(key)).map((key) => [key, cache.get(key)])),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (properties.has(key) ? properties.get(key) : null),
        setProperty: (key, value) => { properties.set(key, String(value)); },
      }),
    },
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: { SHA_256: "sha256" },
      newBlob: (value) => ({ getBytes: () => toSignedBytes(Buffer.from(String(value), "utf8")) }),
      computeDigest: (algorithm, bytes) => toSignedBytes(
        createHash(algorithm).update(Buffer.from(bytes.map((byte) => (byte < 0 ? byte + 256 : byte)))).digest(),
      ),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (content) => ({ setMimeType() { return this; }, getContent: () => content }),
    },
  };

  const context = vm.createContext(sandbox);
  for (const name of order) {
    vm.runInContext(readFileSync(SOURCES[name], "utf8"), context, { filename: `${name}.gs` });
  }

  function call(action, body = {}) {
    const output = context.doPost({ postData: { contents: JSON.stringify({ action, ...body }) } });
    return JSON.parse(output.getContent());
  }

  function ok(action, body = {}) {
    const data = call(action, body);
    if (data.ok === false) throw new Error(`${action} failed: ${data.error}`);
    return data;
  }

  return {
    context,
    spreadsheet,
    cache,
    stats,
    call,
    ok,
    advance(milliseconds) { clock.now += milliseconds; },
    now: () => clock.now,
    sheetRows(name) {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet) return null;
      const [headers, ...rows] = sheet.rows;
      return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
    },
    run: (source) => vm.runInContext(source, context),
  };
}

/** Sets up a workbook with one admin and one participant, both signed in. */
export function createWorkspace(options) {
  const backend = createBackend(options);
  backend.context.setupEvaluationPlatform();
  const admin = backend.ok("login", { username: "admin", password: "admin-password" });
  backend.ok("adminSaveUser", {
    token: admin.token,
    user: {
      username: "budi",
      fullName: "Budi Participant",
      branch: "Jakarta",
      position: "Stars",
      password: "participant-pass",
      role: "participant",
    },
  });
  const participant = backend.ok("login", { username: "budi", password: "participant-pass" });
  return { backend, adminToken: admin.token, participantToken: participant.token };
}

export const SAMPLE_QUESTIONS = Object.freeze([
  { prompt: "Q1", options: ["a", "b", "c", "d"], correct: "A" },
  { prompt: "Q2", options: ["a", "b", "c", "d"], correct: "B" },
  { prompt: "Q3", options: ["a", "b", "c", "d"], correct: "C" },
  { prompt: "Q4", options: ["a", "b", "c", "d"], correct: "D" },
]);
