// utils/fetchWithRetry.js
function parseRetryAfter(header) {
  if (!header) return 0;
  const sec = parseInt(header, 10);
  if (!isNaN(sec)) return sec * 2000;

  const date = new Date(header);
  const now = new Date();
  const diff = date - now;
  return diff > 0 ? diff : 0;
}

export async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  let attempt = 0;
  let delay = 2500;

  while (true) {
    const resp = await fetch(url, options);
    if (resp.status !== 429) return resp;

    attempt++;
    if (attempt > maxRetries) {
      throw new Error(`Too Many Requests: ${url}`);
    }

    const retryAfter = resp.headers.get("Retry-After");
    const waitMs = retryAfter ? parseRetryAfter(retryAfter) : delay;

    console.warn(`429 hit. Retrying after ${waitMs} ms (attempt ${attempt})`);
    await new Promise((res) => setTimeout(res, waitMs));

    delay *= 2;
  }
}
