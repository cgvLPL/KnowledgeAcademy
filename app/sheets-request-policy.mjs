export const EXAM_CAPACITY_TARGET = 50;
export const BACKEND_EXECUTION_TARGET = 30;
export const SHEETS_REQUEST_TIMEOUT_MS = 110_000;
export const BURST_SPREAD_MS = 30_000;
export const RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_000, 4_000, 8_000, 12_000, 18_000]);

const BURST_SENSITIVE_ACTIONS = new Set(["login", "startAttempt", "submitAttempt"]);
const RETRYABLE_ACTIONS = new Set([
  "login",
  "startAttempt",
  "submitAttempt",
  "adminGetDashboard",
]);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR = /temporar|busy|try again|too many|rate.?limit|timed?\s*out|unavailable|unable to reach|internal (?:server )?error|service invoked|simultaneous execution/i;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizedRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

async function responseData(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export function capacityRequestDelayMs(action, requestNumber, retryDelay, random = Math.random) {
  if (!RETRYABLE_ACTIONS.has(action)) return 0;
  const sample = normalizedRandom(random);
  if (requestNumber === 0) {
    return BURST_SENSITIVE_ACTIONS.has(action)
      ? Math.round(sample * BURST_SPREAD_MS)
      : 0;
  }
  const jitterCap = Math.min(1_500, Math.max(250, Math.round(retryDelay / 4)));
  return retryDelay + Math.round(sample * jitterCap);
}

export function shouldRetrySheetsResponse(action, response, data) {
  if (!RETRYABLE_ACTIONS.has(action)) return false;
  if (RETRYABLE_STATUSES.has(response.status)) return true;
  if (!data || data.ok !== false) return false;
  return RETRYABLE_ERROR.test(String(data.error || ""));
}

/**
 * Runs capacity-sensitive requests with a wide first-request spread so a
 * 50-participant event does not immediately consume the Apps Script deployer's
 * 30 simultaneous execution slots. The backend contract remains unchanged.
 * Retries then use bounded backoff for transient quota, network, and lock
 * pressure. Start and submission are idempotent on the server, so ambiguous
 * timeouts can be retried without creating duplicate attempts or results.
 */
export async function fetchSheetsWithRetry(action, fetchRequest, options = {}) {
  const retryable = RETRYABLE_ACTIONS.has(action);
  const delays = retryable ? RETRY_DELAYS_MS : [0];
  const sleep = options.sleep || wait;
  const random = options.random || Math.random;
  const timeoutMs = options.timeoutMs || SHEETS_REQUEST_TIMEOUT_MS;
  let lastResponse = null;
  let lastError = null;

  for (let requestNumber = 0; requestNumber < delays.length; requestNumber += 1) {
    const delay = capacityRequestDelayMs(
      action,
      requestNumber,
      delays[requestNumber],
      random,
    );
    if (delay > 0) await sleep(delay);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchRequest(controller.signal, requestNumber);
      lastResponse = response;
      const data = await responseData(response);
      if (!shouldRetrySheetsResponse(action, response, data)) return response;
    } catch (error) {
      lastError = error;
      if (!retryable) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error
    ? lastError
    : new Error("The exam service could not complete this request.");
}
