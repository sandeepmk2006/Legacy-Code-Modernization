# Legacy Code Modernization

A full-stack web app to ingest legacy Java/COBOL code, modernize it with AI, and manage source flows through GitHub.

## Features

- Upload local source files (`.java`, `.cbl`, `.cob`) or ZIP archives
- Fetch source files from GitHub repositories
- AI-assisted modernization to:
  - Python
  - Go
- Built-in assistant chat for project/code guidance
- Export converted code as a ZIP
- Push modernized output back to GitHub via pull request flow
- Google sign-in via Firebase Authentication

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Express (served via `tsx server.ts`)
- AI: Groq (`llama-3.3-70b-versatile`)
- Auth:
  - Firebase Google OAuth (app login)
  - GitHub OAuth (repo fetch/push)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set required values:

```env
GROQ_API_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# Optional:
# GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
```

3. Start development server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Scripts

- `npm run dev` — Run app (frontend + backend)
- `npm run build` — Build frontend with Vite
- `npm run preview` — Preview production frontend build
- `npm run lint` — Type-check with TypeScript

## OAuth Configuration

### GitHub OAuth App

Use these values for local development:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/github/callback`

### Firebase Google Auth

In Firebase Console:

- Enable **Google** provider under Authentication → Sign-in method
- Ensure `localhost` is in Authorized domains

## Security Notes

- `.env` is ignored by git (via `.gitignore`)
- Never commit API keys or client secrets

## Project Structure

```text
.
├── server.ts
├── src/
│   ├── App.tsx
│   ├── firebase.ts
│   └── components/
│       ├── ChatBot.tsx
│       └── LoginPage.tsx
├── package.json
└── vite.config.ts
```
