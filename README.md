# Praise Play

A daily song-guessing game for Christian music. This repository contains an original starter app and game engine; it does not include copyrighted music or a third-party song catalog.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To make production build:

```bash
npm run build
npm run preview
```

## Add songs and audio

The starter catalog lives in `src/data/songs.ts`. Replace the clearly labeled fictional demo entries with songs you have permission to use. Each entry supports an `audioUrl` (a short, licensed preview URL) and `previewStartSeconds`. Without an audio URL, the game displays the song's hint instead of a play button.

Before using real music, confirm that your hosting, streaming, preview, and game use are covered by the relevant rights and provider terms. Do not scrape another game's catalog or audio. A production catalog should be managed server-side rather than bundled into the browser.

## Current groundwork

- Responsive, accessible React + TypeScript + Vite app.
- One daily puzzle selected consistently for each UTC calendar day.
- Optional audio previews with bounded playback and text-hint fallback.
- Answer choices, answer feedback, and per-day completion saved in the browser.
- Fictional demo catalog and setup notes; no real songs or recordings included.

## Next steps for a production version

1. Choose a licensed music source and obtain permission for the intended preview/game use.
2. Move song metadata and daily puzzle selection to an API/database so answers and future puzzles are not exposed in client code.
3. Add accounts or cross-device statistics only if needed; the current version stores progress locally.
4. Add automated tests, analytics with privacy safeguards, and deployment configuration.

## Tech

React, TypeScript, and Vite. The project is intentionally frontend-only at this stage, so it can be connected to a backend or agent workflow later without locking in a provider.
