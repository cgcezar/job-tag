# JOGTAG - Job Application Tracker

A personal tool for keeping track of job applications: what stage each one is at, which companies have gone quiet, when the interviews are, and which version of the resume was sent where.

Built because spreadsheets do not remind you that a company has not replied in three weeks.

**Live demo:** _ _

---

## What it does

**Pipeline.** Every application moves through five stages: Saved, Applied, Screening, Interview, Offer, plus Rejected and Withdrawn as closing states. Each card shows a stage rail and a silence counter, which turns red once a company has gone quiet for fourteen days or more. Filter by stage, search across titles, companies, and notes.

**Calendar.** A month view holding both the days you applied and the schedules you set: interviews, exams, follow-ups, deadlines. Each schedule can be linked to a specific application, and a Coming Up panel lists what is next.

**Files.** Upload resumes, CVs, cover letters, portfolios, and certificates. Tag any of them to an application so you have a record of which version went to which company. Download any file back out at any time.

**Auto-fill from a job link.** Paste a job posting URL and the app reads the page and fills in the job title, company, location, work setup, employment type, and pay range. If the posting is behind a login wall, paste the job description text instead and it extracts the same fields from that.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Vite |
| Styling | Tailwind CSS 4 with an inline token palette |
| Icons | lucide-react |
| Records | localStorage |
| File contents | IndexedDB |
| Parsing | Vercel serverless function calling the Claude API |
| Hosting | Vercel |

There is no database and no user account. Everything lives in your browser, which keeps the whole thing free to run and keeps your job hunt private. The trade-off is that data is tied to one browser on one device, so the Export button is there for a reason.

---

## Running it locally

You need Node 20 or newer.

```bash
git clone https://github.com/<your-username>/job-application-tracker.git
cd job-application-tracker
npm install
cp .env.example .env.local     # then paste your Anthropic key into it
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
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo. Vercel detects Vite on its own, so leave the build settings alone.
3. Under **Settings, Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | your key from [console.anthropic.com](https://console.anthropic.com) |
   | `ANTHROPIC_MODEL` | optional, defaults to `claude-haiku-4-5-20251001` |

4. Deploy. Any push to `main` redeploys on its own after that.

### Two things to watch out for

**Protect the deployment.** A public URL means anyone who finds it can hit `/api/parse-job` and spend your API credits. There is a basic per-IP rate limit in the function, but that is a speed bump, not a lock. Turn on **Settings, Deployment Protection, Vercel Authentication** so only your Vercel account can open the site. For a personal tool this costs nothing and settles the problem.

**Know the running cost.** Each link read is one Claude API call plus web searches, billed per search. Parsing from pasted text skips search entirely and costs a fraction of a cent. Set a spend limit in the Anthropic console if you want a hard ceiling.

---

## How the auto-fill actually behaves

Worth being upfront, since this is the feature with a real limitation.

The parser works well on public postings: Indeed, JobStreet, company career pages, Workday, Greenhouse, Lever.

LinkedIn is inconsistent. Many LinkedIn job pages are only served to logged-in users, and no server-side fetch gets past that. That is a LinkedIn restriction, not something the code can work around. When it happens, the app says so plainly and opens the paste box.

The paste path works every time and costs less. Open the posting, select all, copy, paste. Either way every field stays editable before you save, so nothing gets locked in wrong.

---

## Project layout

```
api/
  parse-job.js          serverless function, holds the API key
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

- Chrome extension that grabs job details straight from the page you are viewing
- Email scanning for application confirmations and rejections
- A real backend so the same data follows you across devices
- Reminder notifications for the silence counter
- Charts on response rate by company, role type, and month

---

## License

MIT. See [LICENSE](LICENSE).

Built by Clif Cezar.
