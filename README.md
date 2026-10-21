# ZMH-Frontend — Vantage web app

React single-page app for **Vantage by ZMH**. It contains the client dashboard (company, institution,
market analytics, proxy contests, user tools, AI Assistant) and the analyst admin panel.

| Environment | URL | Server | API it calls |
|---|---|---|---|
| Production | `https://ai.zmhadvisors.com` | AWS EC2 c5.large (us-west-2) | `https://api.zmhadvisors.com` |
| Development | `https://dev.zmhadvisors.com` | AWS EC2 c5.large (us-west-2) | `https://api-dev.zmhadvisors.com` |

The app talks to two backends:

- **ZMH-Backend** (Django REST API) — login and every dashboard module
- **ZMH-Backend-Chatbot** (FastAPI, `https://api-chatbot.zmhadvisors.com`) — AI Assistant, activist
  profiles and campaigns, and other AI flows

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | React 18, TypeScript |
| Build tool | Vite 5 |
| State | Redux Toolkit, redux-persist |
| Routing | React Router 6 |
| Styling | Tailwind CSS 3 (+ forms, typography, line-clamp plugins), Headless UI |
| HTTP | axios |
| Charts and maps | Chart.js, Recharts, Leaflet (+ marker clustering) |
| Forms and editors | React Hook Form, React Select, Quill, CKEditor 5 |
| Documents and export | react-pdf / pdf.js, @react-pdf/renderer, jsPDF, pdfmake, xlsx |
| Notes encryption | crypto-js (AES) |
| Package manager | Yarn (`yarn.lock`) |

The UI is built on a commercial Left4Code admin template. Template demo pages are still in
`src/pages` (see [Template leftovers](#template-leftovers)).

---

## Getting started

### 1. Prerequisites

- Node.js 18 or later (required by Vite 5)
- Yarn 1.x

### 2. Install

```bash
git clone <repo-url> ZMH-Frontend
cd ZMH-Frontend
yarn install
```

`yarn install` runs `scripts/fix-tom-select.cjs`, which patches a TypeScript type error in the
`tom-select` package. It also runs before every build.

### 3. Configure

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `VITE_ENVIRONMENT` | Yes | `development` or `production` |
| `VITE_API_BASE_URL` | Yes | Django API base URL. Falls back to the dev or prod URL based on `VITE_ENVIRONMENT` |
| `VITE_NOTES_ENCRYPTION_KEY` | Yes | Key used to encrypt and decrypt note text (see [Notes encryption](#notes-encryption)) |
| `VITE_CHATBOT_API_BASE_URL` | No | AI service base URL. Defaults to `https://api-chatbot.zmhadvisors.com` |
| `VITE_ACTIVIST_CAMPAIGNS_API_BASE_URL` | No | Overrides the AI service URL for activist campaign calls only (useful for local testing) |

> Every `VITE_` variable is compiled into the public JavaScript bundle and can be read by anyone who
> loads the site. Never put API keys, passwords or other secrets in `VITE_` variables.

`.env` is git-ignored. On the servers, the deploy script fills it from AWS Secrets Manager.

### 4. Run

```bash
yarn dev          # local app against the dev API (api-dev.zmhadvisors.com)
yarn dev:prod     # local app against the production API — read-only checks only
```

Vite prints the local URL (default `http://localhost:5173`).

### 5. Build

```bash
yarn build        # type-checks with tsc, then builds to dist/
yarn preview      # serves the built dist/ locally
```

`dist/` is a static site. Any request path must fall back to `index.html` so React Router can handle
it (the old `vercel.json` shows the rewrite rule).

---

## Project structure

```
src/
├── main.tsx            # app entry
├── router/
│   ├── index.tsx       # all routes
│   └── protectedRoute.tsx  # redirects to /login when not signed in
├── pages/              # one folder per screen
├── components/         # shared and feature components (cards, tables, modals, charts)
├── services/           # API calls, one folder per backend module
├── stores/             # Redux store and slices
├── config/
│   └── environment.ts  # API base URLs from VITE_ variables
├── utils/              # helpers, including notesCrypto.ts
├── hooks/              # shared React hooks
├── types/              # TypeScript types
├── constant/           # constants and dropdown options
├── themes/             # layout shells (sidebar, top bar)
├── assets/             # images, fonts, CSS
└── fakers/             # template demo data (not used by product pages)
```

### Services

Each folder in `src/services/` wraps the Django endpoints for one module, for example
`authentiction`, `company`, `dashboard`, `institution`, `shareholderProposal`, `caseStudies`,
`engagementQuestion`, `governance`, `compensationProposals`, `proxyContestAI`, `notes`,
`domainNotes`, `newsletter`, `notifications`, `userManagement` and `reports`. Pages call services;
pages do not call axios directly.

---

## Feature-to-route map

| Feature | Route(s) | Main page folder |
|---|---|---|
| Login, sign-up | `/login`, `/register` | `Login`, `Register` |
| Company dashboard (Overview, Ownership, Meetings, Voting, Proposals, Engagement, Case Studies, Report) | `/company/:id` | `Company`, `ZMHDashboard` |
| Institution insights | `/institution`, `/institution/:id`, `/institution/:id/documents`, `/investor-profile`, `/investor-details` | `Institution`, `InvestorProfiles` |
| VDS voting data | `/voting-data`, `/vds-details`, `/vds-proxy-details`, `/voting-rationale` | `VdsProxyVoting`, `VotingRationalePage` |
| N-PX voting data | `/npx-details`, `/npx-analytics`, `/npx-proposal-voting-stats` | `NPX`, `NPXAnalytics`, `NpxProposalVotingStats` |
| Exec. Comp. voting data | `/executive-compensation` | `ExecutiveCompensation` |
| Shareholder meetings | `/2025-shareholder-meetings`, `/summary-details` | `AgmSummaryDetails` |
| Shareholder proposals | `/shareholder-proposal`, `/shareholder-proposal/:id` | `sharedHolder` |
| Case studies | `/case-studies`, `/case-studies/:id`, `/case-studies-ai` | `CaseStudies`, `CaseStudiesAI` |
| Engagement | `/engagement-detail`, `/engagement-question`, `/engagement-question/:id` | `EngagementQuestion` |
| Voting guidelines | `/voting-guidelines`, `/voting-guidelines/pdf-sumamry/:id` | `ProxyVotingGuideline` |
| Proxy contests | `/proxy-contest`, `/proxy-contest-detail/:companyId`, `/proxy-contest-ai`, `/activist-filings`, `/activist-campaigns`, `/activist-dashboard` | `ProxyContest`, `ProxyContestDetail`, `ProxyContestAI`, `ActivistFilings`, `ActivistCampaigns` |
| Reports | `/company-report`, `/custom-reports` | `CompanyReport`, `CustomReports.tsx` |
| Benchmarking | (within company and user tools) | `PeerAnalysis` |
| Notes | `/notes`, `/institution-notes` | `Notes` |
| Newsletter | `/newsletter` | `NewsletterV2` |
| AI Assistant | `/ai-assistant`, `/ai-assistant/voting-guidelines`, `/ai-assistant/compare-documents`, `/ai-search` | `AIChatbot`, `AISearchOnly` |
| Admin: users | `/user-management`, `/user-details`, `/user-details/login-history/:id` | `UserManagement`, `UserDetails` |

---

## Notes encryption

Note text is encrypted with AES (crypto-js) before it is sent to the API and decrypted when displayed.
The logic is in `src/utils/notesCrypto.ts` and is applied in `src/services/domainNotes/`.

- Encrypted values start with the prefix `[ENC_V1]`; older plain-text notes are still readable.
- If `VITE_NOTES_ENCRYPTION_KEY` is missing, notes are saved without encryption and existing
  encrypted notes show "Note is encrypted". Always set the key in every environment.
- Because the key is a `VITE_` variable it ships in the browser bundle. Moving encryption to the
  backend with AWS KMS is planned; after that change, remove the key from the frontend.

---

## Deployment

1. Build on the target server (or in CI) with that environment's `.env`:
   ```bash
   yarn install --frozen-lockfile
   yarn build
   ```
2. Serve `dist/` as static files with an `index.html` fallback for all paths.
3. Production serves `ai.zmhadvisors.com`; development serves `dev.zmhadvisors.com`.

Record the exact deploy steps (web server, process manager, script location) here when they are
written up.

---

## Template leftovers

These folders under `src/pages` come from the Left4Code template and are not part of Vantage. They can
be deleted, together with their routes in `src/router/index.tsx` and the files in `src/fakers/`, once
nothing imports them:

`Accordion`, `AddProduct`, `Alert`, `Billing`, `Button`, `Calendar`, `Categories`, `Chart`, `Chat`,
`Creative`, `DashboardOverview1`–`DashboardOverview8`, `Datepicker`, `Departments`, `Dropdown`,
`FileManagerGrid`, `FileManagerList`, `FileUpload`, `Icon`, `ImageZoom`, `Inbox`, `Invoice`,
`LoadingIcon`, `Modal`, `PointOfSale`, `ProductGrid`, `ProductList`, `ProfileOverview`, `ProgressBar`,
`RegularForm`, `RegularTable`, `Reviews`, `SellerDetail`, `SellerList`, `Slideover`, `Slider`, `Tab`,
`Tabulator`, `TomSelect`, `Tooltip`, `TransactionDetail`, `TransactionList`, `Typography`,
`Validation`, `WysiwygEditor`.

Check each with a search before deleting; some shared components may import from them.

---

## Conventions

- Add API calls to the matching folder in `src/services/`, typed with interfaces in `src/types/`.
- Read base URLs only from `src/config/environment.ts`; do not hard-code API hosts in components.
- Keep secrets out of the frontend entirely.
- Run `yarn build` before opening a pull request; it fails on TypeScript errors.
