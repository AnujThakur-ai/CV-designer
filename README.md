# folio — Resume Studio

**Build a polished, personalized CV with a live preview and 50 distinctive templates.**

[Open the live website](https://folio-resume-studio.netlify.app/)

folio is a responsive resume editor for creating, styling, and exporting a CV. Edit your details in the browser, choose a layout for your profession, and see changes in the preview as you work.

## Features

- **Live resume editor:** Update your profile, experience, projects, education, skills, certifications, awards, and custom sections.
- **50 field-aware templates:** Explore layouts for technology, creative work, academia, leadership, legal and policy, marketing, healthcare, education, public service, and operations.
- **Profile photo and styling:** Add a local photo, choose typography and spacing, and personalize the accent color.
- **Profile import:** Fetch public GitHub profile details and projects by username or profile URL without signing in; optionally connect GitHub for pinned repositories and higher API limits. Import a LinkedIn profile PDF or a folio JSON export and review parsed information before applying it.
- **AI-assisted summaries:** Optionally draft an experience summary when the server-side OpenAI integration is configured.
- **Export and local privacy:** Download a PDF through the browser print dialog or export/import a JSON backup. Resume content is autosaved in this browser; it is not uploaded as part of normal editing.
- **Accessible and responsive controls:** Keyboard-operable section ordering, reduced-motion support, and layouts for narrower screens.

## Live demo

[https://folio-resume-studio.netlify.app/](https://folio-resume-studio.netlify.app/)

The public demo supports public GitHub imports and local profile-file imports. OAuth and AI features require server-side deployment configuration; see [Deployment](#deployment).

## Run locally

### Requirements

- Node.js 20 or later
- npm

### Install and start

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. This starts the frontend only.

To run the Vercel API routes locally, install the Vercel CLI, configure the environment variables below, then run:

```bash
npm run dev:vercel
```

## Profile integrations

### GitHub

Public GitHub profiles can be imported without signing in; the anonymous GitHub API limit applies. Optional GitHub OAuth connects through server-side Vercel functions to review pinned repositories and increase API limits. Forks are filtered by default, and private repositories are not imported.

### LinkedIn

LinkedIn OpenID Connect provides identity information only; it does not provide employment history through the configured scopes. Import a LinkedIn profile PDF or a supported folio JSON file to parse work history locally. Parsed information should be reviewed before use. folio does not scrape LinkedIn.

### Optional AI summaries

When configured, the AI summary route sends selected experience text to OpenAI only after the user requests a draft. Review generated content for accuracy before applying it.

## Deployment

The frontend is published at [folio-resume-studio.netlify.app](https://folio-resume-studio.netlify.app/). The profile and AI endpoints in this repository are **Vercel serverless functions** under `api/`. A static Netlify deployment alone does not run those Vercel functions. To enable them, deploy the project to Vercel or port the API routes to a compatible functions platform and configure the frontend to use that backend.

For Vercel:

1. Import this repository into Vercel. The frontend build output is `dist`; files under `api/` are deployed as serverless functions.
2. Register GitHub and LinkedIn OAuth callback URLs using your deployment origin:
   - `https://YOUR_DOMAIN/api/oauth/github/callback`
   - `https://YOUR_DOMAIN/api/oauth/linkedin/callback`
3. Configure these environment variables for the Vercel deployment:
   - `APP_BASE_URL`
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
   - `OAUTH_COOKIE_SECRET`
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Optional: `OPENAI_API_KEY` for AI summaries
4. Generate a 32-byte cookie-encryption key with `openssl rand -hex 32`. Keep credentials in the hosting provider's environment settings; never commit them.

`OAUTH_COOKIE_SECRET` must be 64 hexadecimal characters. Profile and AI routes fail closed unless Upstash rate limiting is configured.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend |
| `npm run dev:vercel` | Run the application and Vercel API routes locally |
| `npm test` | Run security, normalization, and template tests |
| `npm run build` | Type-check the API and frontend, then build for production |
| `npm run preview` | Preview the production frontend build |

## Technology

React, TypeScript, Vite, Framer Motion, Zod, PDF.js, and Vercel Functions.

## Privacy and limitations

- Resume content is stored in this browser's local storage. Export a JSON backup if you want to move it to another device.
- OAuth tokens are encrypted in secure, HTTP-only cookies. Provider requests are made only when the user starts an import.
- GitHub public API limits apply. LinkedIn PDF parsing is heuristic; verify imported details.
- PDF pagination depends on the browser and the amount of resume content.

## License

No license file is currently included. All rights reserved unless the repository owner adds a license.
