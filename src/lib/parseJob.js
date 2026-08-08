/**
 * Talks to /api/parse-job. The Anthropic key stays on the server,
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
    throw new Error(
      "The parser is not running. On your machine, start it with `vercel dev` instead of `npm run dev`."
    );
  }

  if (!res.ok || !body.ok) {
    throw new Error(body.error || "The posting could not be read.");
  }
  return body;
}

export const parseFromUrl = (url) => post({ url });
export const parseFromText = (text) => post({ text });
