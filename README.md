# Praise Play

A private, personal daily song-guessing game focused on Christian music. This repository contains an original starter app and game-design groundwork; it does not include copyrighted recordings or a third-party song catalog.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To make a production build:

```bash
npm run build
npm run preview
```

## Current groundwork

- Responsive React + TypeScript + Vite starter app.
- Stable daily puzzle selection and local completion state.
- Song metadata type with extensible genre tags.
- A proposed, configurable clip progression and broad genre taxonomy documented in `docs/game-design.md`.
- Spotify integration and catalog import are intentionally not implemented: private use alone does not establish that Spotify permits a music-quiz/game use. See `docs/music-content-and-spotify.md` and confirm permission with Spotify before connecting it.
- Fictional demo entries only; no real songs or recordings included.

## Adding music

Replace demo entries only with content you have permission to use. Do not scrape another game's catalog or audio. A production catalog should be managed outside the browser bundle so answers and future daily puzzles are not exposed to players.

Review `docs/music-content-and-spotify.md` before connecting a provider. Do not put Spotify client secrets, API tokens, or other credentials in frontend code or commit them to Git.

## Next steps

1. Decide on a permitted audio source and obtain any required permission for the quiz/game use.
2. You: create a Spotify Developer app only if Spotify confirms your intended use is allowed; then keep credentials private and configure redirect URLs.
3. Choose a starter set of genre tags from `src/data/genres.ts`; add more tags as needed without trying to model every microgenre on day one.
4. Add authorized songs with metadata, genre tags, and audio capability supported by your chosen source.
5. Implement the staged listening/guessing loop against the approved audio source; the current UI is a scaffold, not a finished integration.
6. Add tests and deploy privately only after the provider and content rights are settled.

## Tech

React, TypeScript, and Vite. This is intentionally frontend-only at this stage and does not lock the project into a backend or music provider.
