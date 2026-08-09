/**
 * POST /api/parse-job
 *
 * Body: { url: "https://..." }  or  { text: "pasted job description" }
 * Returns: { ok, found, source, data: { title, company, location, workSetup, employmentType, salary, notes } }
 *
 * Two providers, picked with PARSER_PROVIDER:
 *   "nvidia"    build.nvidia.com free tier, OpenAI-compatible  (default)
 *   "anthropic" Claude API
 *
 * NVIDIA models cannot browse, so for a URL this function fetches the page
 * itself, pulls out the JobPosting data, and hands that to the model.
 */

const PROVIDER = (process.env.PARSER_PROVIDER || "nvidia").toLowerCase();
const FETCH_TIMEOUT_MS = 12000;

/* ------------------------------------------------------------------ *
 * Prompt
 * ------------------------------------------------------------------ */
const SCHEMA_RULES = `Reply with ONE JSON object and nothing else. No markdown fences, no explanation, no preamble, no reasoning.

Keys:
"title": the job title, "" if unknown
"company": the hiring company, "" if unknown
"location": city and country as written, "" if unknown
"workSetup": exactly one of "On-site", "Hybrid", "Remote", "Unknown"
"employmentType": exactly one of "Full-time", "Part-time", "Contract", "Internship", "Unknown"
"salary": the pay range as written, "" if not stated
"notes": one sentence, 25 words maximum, on what the role covers. "" if unknown

Never invent a company or a job title. Leave a field as "" rather than guessing.`;

/* ------------------------------------------------------------------ *
 * Page fetching and extraction
 * ------------------------------------------------------------------ */
async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Plenty of job boards return a stub page to anything that looks like a bot.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`Page responded ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#39;": "'", "&apos;": "'", "&mdash;": "-", "&ndash;": "-",
};

function decode(str) {
  return String(str)
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(html) {
  return decode(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Walks nested JSON-LD, including @graph arrays, looking for a JobPosting. */
function findJobPosting(node, depth = 0) {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findJobPosting(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("JobPosting")) return node;

  if (node["@graph"]) return findJobPosting(node["@graph"], depth + 1);
  return null;
}

function extractStructured(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const hit = findJobPosting(JSON.parse(match[1].trim()));
      if (hit) return hit;
    } catch {
      /* one malformed block should not stop the others */
    }
  }
  return null;
}

/** Flattens a JobPosting object into a compact block of labelled lines. */
function structuredToText(job) {
  const org = job.hiringOrganization;
  const company = typeof org === "string" ? org : org?.name || "";

  const locations = []
    .concat(job.jobLocation || [])
    .map((l) => {
      const a = l?.address || l;
      return [a?.addressLocality, a?.addressRegion, a?.addressCountry?.name || a?.addressCountry]
        .filter((v) => typeof v === "string")
        .join(", ");
    })
    .filter(Boolean);

  const remote = /TELECOMMUTE/i.test(String(job.jobLocationType || ""));

  const value = job.baseSalary?.value;
  const salary = value
    ? `${[value.minValue, value.maxValue].filter((v) => v != null).join(" to ")} ${
        job.baseSalary.currency || ""
      } per ${value.unitText || ""}`.trim()
    : "";

  const lines = [
    ["Title", job.title],
    ["Company", company],
    ["Location", locations.join(" | ")],
    ["Remote flag", remote ? "TELECOMMUTE" : ""],
    ["Employment type", [].concat(job.employmentType || []).join(", ")],
    ["Salary", salary],
    ["Description", job.description ? htmlToText(String(job.description)).slice(0, 6000) : ""],
  ].filter(([, v]) => v);

  return lines.map(([k, v]) => `${k}: ${v}`).join("\n");
}

/* ------------------------------------------------------------------ *
 * Providers
 * ------------------------------------------------------------------ */
async function askNvidia(prompt) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY is not set. Add it in your Vercel project settings.");

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
      messages: [
        {
          role: "system",
          content: "You extract structured data from job postings. You output raw JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 402) throw new Error("NVIDIA credits are used up. Request more at build.nvidia.com.");
    if (res.status === 404)
      throw new Error("That NVIDIA model ID was not found. Copy the exact ID from its page on build.nvidia.com.");
    if (res.status === 429) throw new Error("NVIDIA rate limit hit. Wait a moment and try again.");
    throw new Error(`NVIDIA responded ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function askAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic responded ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
}

const ask = (prompt) => (PROVIDER === "anthropic" ? askAnthropic(prompt) : askNvidia(prompt));

/* ------------------------------------------------------------------ *
 * Output handling
 * ------------------------------------------------------------------ */
function extractJSON(raw) {
  // Some open models emit a <think> block before the answer. Drop it.
  const cleaned = String(raw || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The model did not return usable JSON.");
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

/* Soft per-IP limiter. Serverless instances recycle, so this smooths bursts
   rather than guaranteeing a cap. See the README on Deployment Protection. */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > 12;
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
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

  let sourceText;
  let source;

  try {
    if (typeof url === "string" && url.trim()) {
      if (!/^https?:\/\//i.test(url.trim())) {
        return res.status(400).json({ ok: false, error: "That does not look like a valid link." });
      }

      let html;
      try {
        html = await fetchPage(url.trim());
      } catch {
        return res.status(200).json({
          ok: true,
          found: false,
          source: "blocked",
          data: clean({}),
          error: "That site blocked the request. Paste the job description instead.",
        });
      }

      const structured = extractStructured(html);
      if (structured) {
        sourceText = structuredToText(structured);
        source = "structured";
      } else {
        sourceText = htmlToText(html).slice(0, 14000);
        source = "page-text";
      }

      // A login wall usually returns a short page with no job content in it.
      if (sourceText.length < 200) {
        return res.status(200).json({
          ok: true,
          found: false,
          source: "login-wall",
          data: clean({}),
          error: "That posting needs a login. Paste the job description instead.",
        });
      }
    } else if (typeof text === "string" && text.trim().length >= 40) {
      sourceText = text.slice(0, 14000);
      source = "pasted";
    } else {
      return res
        .status(400)
        .json({ ok: false, error: "Send either a job link or at least 40 characters of the posting text." });
    }

    const output = await ask(
      `Pull the job details out of this posting.\n\n---\n${sourceText}\n---\n\n${SCHEMA_RULES}`
    );
    const parsed = clean(extractJSON(output));

    return res.status(200).json({
      ok: true,
      found: Boolean(parsed.title || parsed.company),
      source,
      data: parsed,
    });
  } catch (err) {
    console.error("parse-job failed:", err);
    return res.status(502).json({ ok: false, error: err.message || "The posting could not be read." });
  }
}
