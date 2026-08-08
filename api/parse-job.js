/**
 * POST /api/parse-job
 *
 * Body: { url: "https://..." }  or  { text: "pasted job description" }
 * Returns: { ok, found, data: { title, company, location, workSetup, employmentType, salary, notes } }
 *
 * The Anthropic key lives here on the server. It is never sent to the browser.
 */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

const SCHEMA_RULES = `Reply with ONE JSON object and nothing else. No markdown fences, no explanation, no preamble.

Keys:
"title": the job title, "" if unknown
"company": the hiring company, "" if unknown
"location": city and country as written in the posting, "" if unknown
"workSetup": exactly one of "On-site", "Hybrid", "Remote", "Unknown"
"employmentType": exactly one of "Full-time", "Part-time", "Contract", "Internship", "Unknown"
"salary": the pay range as written, "" if not stated
"notes": one sentence, 25 words maximum, on what the role covers. "" if unknown
"found": true only if you actually read the posting content. false if the page was blocked, removed, or you had to guess.

Never invent a company or a job title. Leave a field as "" rather than guessing.`;

/* A small per-IP limiter. Serverless instances recycle, so this softens bursts
   rather than guaranteeing a hard cap. Real protection comes from Vercel
   Deployment Protection, see the README. */
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function extractJSON(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const SETUPS = ["On-site", "Hybrid", "Remote", "Unknown"];
const TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Unknown"];

function clean(raw) {
  const str = (v) => (typeof v === "string" ? v.trim().slice(0, 300) : "");
  return {
    title: str(raw.title),
    company: str(raw.company),
    location: str(raw.location),
    workSetup: SETUPS.includes(raw.workSetup) ? raw.workSetup : "Unknown",
    employmentType: TYPES.includes(raw.employmentType) ? raw.employmentType : "Unknown",
    salary: str(raw.salary),
    notes: str(raw.notes),
  };
}

async function askClaude(messages, tools) {
  const body = { model: MODEL, max_tokens: 1024, messages };
  if (tools) body.tools = tools;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API responded ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data.content || [])
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: "ANTHROPIC_API_KEY is not set. Add it in your Vercel project settings, then redeploy.",
    });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Too many requests. Wait a minute and try again." });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  const { url, text } = payload || {};

  try {
    let output;

    if (typeof url === "string" && url.trim()) {
      if (!/^https?:\/\//i.test(url.trim())) {
        return res.status(400).json({ ok: false, error: "That does not look like a valid link." });
      }
      output = await askClaude(
        [
          {
            role: "user",
            content: `Use web search to open and read this job posting, then pull out its details:\n${url.trim()}\n\n${SCHEMA_RULES}`,
          },
        ],
        [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }]
      );
    } else if (typeof text === "string" && text.trim().length >= 40) {
      output = await askClaude([
        {
          role: "user",
          content: `Pull the job details out of this posting text.\n\n---\n${text.slice(0, 12000)}\n---\n\n${SCHEMA_RULES}`,
        },
      ]);
    } else {
      return res
        .status(400)
        .json({ ok: false, error: "Send either a job link or at least 40 characters of the posting text." });
    }

    const raw = extractJSON(output);
    return res.status(200).json({
      ok: true,
      found: raw.found === true,
      data: clean(raw),
    });
  } catch (err) {
    console.error("parse-job failed:", err);
    return res.status(502).json({
      ok: false,
      error: "The posting could not be read. Paste the job description instead.",
    });
  }
}
