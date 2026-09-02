# Job Application Tracker

A personal tool for keeping track of job applications: what stage each one is at, which companies have gone quiet, when the interviews are, and which version of the resume was sent where.

Built because spreadsheets do not remind you that a company has not replied in three weeks.

**Live demo:** 

---

## What it does

**Pipeline.** Every application moves through five stages: Saved, Applied, Screening, Interview, Offer, plus Rejected and Withdrawn as closing states. Each card shows a stage rail and a silence counter, which turns red once a company has gone quiet for fourteen days or more. Filter by stage, search across titles, companies, and notes.

**Calendar.** A month view holding both the days you applied and the schedules you set: interviews, exams, follow-ups, deadlines. Each schedule can be linked to a specific application, and a Coming Up panel lists what is next.

**Files.** Upload resumes, CVs, cover letters, portfolios, and certificates. Tag any of them to an application so you have a record of which version went to which company. Download any file back out at any time.

**Auto-fill from a job link.** Paste a job posting URL. The server fetches the page, pulls out its embedded `JobPosting` data, and a language model turns that into job title, company, location, work setup, employment type, and pay range. If the site blocks the fetch, paste the job description text instead and it extracts the same fields from that.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Vite |
| Styling | Tailwind CSS 4 with an inline token palette |
| Icons | lucide-react |
| Records | localStorage |
| File contents | IndexedDB |
| Parsing | Vercel serverless function plus a hosted language model |
| Hosting | Vercel |

There is no database and no user account. Everything lives in your browser, which keeps the whole thing free to run and keeps your job hunt private. The trade-off is that data is tied to one browser on one device, so the Export button is there for a reason.

---

## The API key: free by default

The parser runs on **NVIDIA's free model catalog** at [build.nvidia.com](https://build.nvidia.com). Joining the NVIDIA Developer Program takes an email and no credit card, and the endpoint speaks the standard OpenAI chat format.

Getting a key:

1. Sign in at [build.nvidia.com](https://build.nvidia.com) and join the Developer Program.
2. Open any model page and click **Get API Key**. The key starts with `nvapi-`.
3. Copy the exact model ID from that same page. Catalog IDs change, and a stale one returns a 404.

Free tier in practice: you start with roughly 1,000 credits, and requesting more through your profile can raise that to about 5,000. There is a rate limit somewhere near 40 requests per minute, which is irrelevant here since you are parsing one posting at a time. Some smaller models stay usable after credits run out.

Two honest caveats:

- NVIDIA's terms scope the hosted free tier to development, testing, and evaluation. A private tracker only you use sits comfortably in that description. If this ever became a product with real users, that would need a different arrangement.
- Credits do run out eventually. When they do, switch `PARSER_PROVIDER` to `anthropic` and add an Anthropic key, or self-host a NIM container. The code supports both without any other change.

### Swapping providers

Set `PARSER_PROVIDER` to `nvidia` or `anthropic`. Nothing else in the codebase needs touching.

---

## Running it locally

You need Node 20 or newer.

```bash
git clone https://github.com/cgcezar/job-tag.git
cd job-tag
npm install
cp .env.example .env.local     # then paste your nvapi- key into it
```

Two ways to run it:

```bash
npm run dev      # UI only. Everything works except the "Read link" button.
```

```bash
npm i -g vercel
vercel dev       # UI plus the /api function, so auto-fill works too
```

The auto-fill needs the serverless function running, which `npm run dev` does not start on its own. Use `vercel dev` when you want to test that part.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import it. Vercel detects Vite on its own, so leave the build settings alone.
3. Under **Settings, Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `PARSER_PROVIDER` | `nvidia` |
   | `NVIDIA_API_KEY` | your `nvapi-` key |
   | `NVIDIA_MODEL` | optional, the exact model ID from build.nvidia.com |

4. Deploy. Any push to `main` redeploys on its own after that.

**Protect the deployment.** A public URL means anyone who finds it can hit `/api/parse-job` and burn your free credits. There is a per-IP rate limit in the function, but that is a speed bump, not a lock. Turn on **Settings, Deployment Protection, Vercel Authentication** so only your Vercel account can open the site. It costs nothing and settles the problem.

---

## How the auto-fill actually works

Since NVIDIA's models cannot browse, the server does the fetching itself. Three steps:

1. **Fetch the page** with a normal browser user agent and a twelve second timeout.
2. **Look for JSON-LD.** Most job boards embed a `JobPosting` block in the page source, containing title, company, location, employment type, and salary as clean structured data. When that block is there, it gets used directly, which is both more accurate and far cheaper than making a model read raw page text.
3. **Fall back to stripped page text** when there is no JSON-LD, then let the model pull the fields out.

What this means in practice:

| Source | Result |
| --- | --- |
| Greenhouse, Lever, company career pages | Usually clean, JSON-LD is almost always present |
| JobStreet, Indeed | Often works, sometimes blocked |
| LinkedIn | Usually blocked, most job pages are served only to logged-in users |
| Anything JavaScript-rendered with no JSON-LD | Falls back to paste |

LinkedIn being unreliable is a LinkedIn restriction, not something this code can work around. When a fetch fails, the app says exactly why and opens the paste box. The paste path works every time and uses fewer credits, since it skips the fetch entirely. Either way every field stays editable before you save.

---

## Project layout

```
api/
  parse-job.js          fetches, extracts, and parses. Holds the API key.
src/
  lib/
    constants.js        palette, stage names, shared enums
    dates.js            timezone-safe date keys and month grids
    storage.js          localStorage records, IndexedDB blobs, backup
    parseJob.js         client side of the parser
  components/
    ui.jsx              inputs, buttons, modal, stage rail
    ApplicationForm.jsx add and edit, including auto-fill
    Pipeline.jsx        list, stats, filters, search
    CalendarView.jsx    month grid and schedules
    FilesView.jsx       upload, download, delete
  App.jsx               state, persistence, tabs, backup
```

---

## Backing up

The Export button in the header downloads a JSON file with every application and schedule. Import reads it back. Uploaded files are not included, since bundling binaries into JSON gets unwieldy, so keep your resume originals in Drive as well.

Clearing browser data wipes everything. Export before you do that.

---

## Ideas not built yet

- Chrome extension that grabs job details straight from the page you are viewing, which sidesteps the login wall problem completely
- Email scanning for application confirmations and rejections
- A real backend so the same data follows you across devices
- Reminder notifications for the silence counter
- Charts on response rate by company, role type, and month

---

## License

MIT. See [LICENSE](LICENSE).

Built by Clif Cezar.
