export const EXAM_CAPACITY_TARGET = 30;
export const SHEETS_REQUEST_TIMEOUT_MS = 110_000;
export const BURST_SPREAD_MS = 900;
export const RETRY_DELAYS_MS = Object.freeze([0, 650, 1_500, 3_000, 6_000, 10_000]);

const RETRYABLE_ACTIONS = new Set(["login", "startAttempt", "submitAttempt"]);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR = /temporar|busy|try again|too many|rate.?limit|timed?\s*out|unavailable|unable to reach|internal (?:server )?error|service invoked/i;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function responseData(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export function shouldRetrySheetsResponse(action, response, data) {
  if (!RETRYABLE_ACTIONS.has(action)) return false;
  if (RETRYABLE_STATUSES.has(response.status)) return true;
  if (!data || data.ok !== false) return false;
  return RETRYABLE_ERROR.test(String(data.error || ""));
}

/**
 * Runs capacity-sensitive exam requests with a small first-request spread,
 * a timeout longer than the backend's write queue, and bounded backoff.
 * Start and submission are idempotent on the server, so an ambiguous timeout
 * can be retried without creating a duplicate attempt or result.
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
    const retryDelay = delays[requestNumber];
    const spread = requestNumber === 0 && retryable
      ? Math.round(random() * BURST_SPREAD_MS)
      : Math.round(random() * Math.min(500, retryDelay / 3));
    if (retryDelay + spread > 0) await sleep(retryDelay + spread);

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
