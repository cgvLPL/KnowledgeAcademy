"use client";

import { useEffect } from "react";

const TABLE_SELECTOR = "table";

function normaliseHeader(value: string, index: number) {
  const label = value.replace(/\s+/g, " ").trim();
  return label || (index === 0 ? "Details" : "Actions");
}

function enhanceTable(table: HTMLTableElement) {
  if (table.closest("[data-mobile-table-cards='off']")) return;

  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"))
    .map((header, index) => normaliseHeader(header.textContent ?? "", index));

  if (!headers.length) return;

  table.dataset.mobileCardTable = "true";

  table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
    const cells = Array.from(row.children).filter(
      (cell): cell is HTMLTableCellElement => cell instanceof HTMLTableCellElement,
    );

    if (!cells.length) return;

    const isSingleSpanningCell = cells.length === 1 && cells[0].colSpan > 1;
    row.dataset.mobileCardRow = isSingleSpanningCell ? "empty" : "true";

    cells.forEach((cell, index) => {
      if (isSingleSpanningCell) {
        delete cell.dataset.mobileLabel;
        return;
      }

      cell.dataset.mobileLabel = headers[index] ?? `Field ${index + 1}`;
    });
  });
}

function enhanceAllTables(root: ParentNode = document) {
  root.querySelectorAll<HTMLTableElement>(TABLE_SELECTOR).forEach(enhanceTable);
}

export default function MobileTableCardEnhancer() {
  useEffect(() => {
    enhanceAllTables();

    const observer = new MutationObserver((mutations) => {
      let shouldRefresh = false;

      for (const mutation of mutations) {
        if (mutation.type !== "childList" || mutation.addedNodes.length === 0) continue;
        shouldRefresh = true;
        break;
      }

      if (shouldRefresh) enhanceAllTables();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
