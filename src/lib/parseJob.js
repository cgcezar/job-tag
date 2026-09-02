/**
 * Talks to /api/parse-job. The model API key stays on the server,
 * so nothing sensitive ends up in the browser bundle.
 */
async function post(payload) {
  let res;
  try {
    res = await fetch("/api/parse-job", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach the parser. Check your connection.");
  }

  let body;
  try {
    body = await res.json();
  } catch {
    // Anything that is not JSON means the request never reached the function:
    // a 404 HTML page, a crash page, or a gateway timeout. Say which, because
    // the fix is different for each.
    throw new Error(parserUnreachable(res.status));
  }

  if (!res.ok || !body.ok) {
    throw new Error(body.error || "The posting could not be read.");
  }
  return body;
}

/** Explains a non-JSON reply from /api/parse-job by status code. */
function parserUnreachable(status) {
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  if (status === 404) {
    return local
      ? "No parser is running on this machine. Build the app, then start it: npm run build, then node --env-file=.env server.js."
      : "The parser endpoint is missing (404). The /api/parse-job function is not part of this deployment.";
  }
  if (status === 504) {
    return "The parser timed out before it could read that page. Paste the job description instead.";
  }
  return `The parser failed before it could answer (HTTP ${status}). Check the server logs.`;
}

export const parseFromUrl = (url) => post({ url });
export const parseFromText = (text) => post({ text });

/* ------------------------------------------------------------------ *
 * Result -> UI message
 * ------------------------------------------------------------------ *
 * api/parse-job.js reports how it got the text in `source`. A readable
 * failure comes back as ok:true / found:false with a `source` naming the
 * reason and an `error` written for the user, so the only thing thrown is
 * a genuine fault (network, missing key, model failure).
 *
 * Sources it can send:
 *   "structured"          schema.org JobPosting data on the page
 *   "page-text"           no structured data, scraped the visible text
 *   "page-text-fallback"  structured data was there but too thin to use,
 *                         so the visible text was scraped instead — the
 *                         usual cause is an expired posting whose schema
 *                         has been stripped while the page still reads fine
 *   "pasted"              text the user pasted in
 *   "blocked"             host is on the known-blocked list (Kalibrr,
 *                         LinkedIn, ...), refused the fetch, or answered
 *                         with a bot-check page
 *   "short-content"       page came back but had no usable job text
 */
const SUCCESS = {
  structured: "Filled in from the link. Check the fields before saving.",
  "page-text": "Filled in from the page text. Check the fields before saving.",
  "page-text-fallback":
    "Filled in from the page text — the posting's structured data was incomplete, which usually means it has expired. Check the fields closely before saving.",
  pasted: "Filled in from the pasted text. Check the fields before saving.",
};

const FAILURE = {
  blocked: "That site blocks automated requests. Open the link, copy the job description, and paste it below.",
  "short-content":
    "Couldn't read that posting — it may need a login or JavaScript. Open the link, copy the job description, and paste it below.",
  pasted: "Couldn't pull any details out of that text. Paste more of the posting and try again.",
};

/**
 * Turns a parser result into the notice to show:
 *   { kind: "ok" | "warn", text, suggestPaste }
 * `suggestPaste` marks the cases where pasting the description is the way
 * forward, so the form can open the paste box.
 */
export function describeResult(result) {
  const data = result?.data || {};
  const source = result?.source;

  if (result?.found && (data.title || data.company)) {
    return {
      kind: "ok",
      text: SUCCESS[source] || "Filled in. Check the fields before saving.",
      suggestPaste: false,
    };
  }

  return {
    kind: "warn",
    // The server writes the specific line (which platform blocked it, and
    // why), so prefer it and fall back to a per-source default.
    text:
      result?.error ||
      FAILURE[source] ||
      "Nothing usable came back from that page. Open the link, copy the job description, and paste it below.",
    suggestPaste: source !== "pasted",
  };
}
