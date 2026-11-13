# Praise Play

A Christian-music song-guessing game. Each song starts at **0.1 seconds** of audio. You decide how much more to hear (up to 30 seconds), and the less you needed, the more points you get.

## How it plays

- **Runs of 5 songs**, ordered from best-known to least-known (Easy → Legend), scored out of 50,000. There's no daily limit.
- **Unlocking more:** drag the logarithmic scrubber, tap the 0.1s, 0.5s, 1s and 3s buttons, or press +1s. The current "worth" updates as you go.
- **Scoring:** 10,000 points at 0.1s, falling steeply at first and reaching 3,000 at the full 30s (`clipWorth` in `src/lib/scoring.ts`). Each wrong guess costs 500, and the song keeps going. Skip reveals the answer and scores 0.
- **Run options:** pick any mix of genres, up to 20 artists, an era range, and "well-known only". The pool size updates as you change them. A narrow pool is still ranked from easy to hard.
- **Today's run:** the same 5 songs for everyone each day, so you can compare scores. Each day can be played once.
- **End of run:** a per-song breakdown, a shareable emoji summary, and your best/average/fastest stats (stored on the device).

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Adding songs

Edit `src/data/songs.ts`. Each song needs a unique `id`, `title`, `artist`, one or more `genres` from `src/data/genres.ts`, and a `popularity` from 1 to 10. Popularity sets how early the song can appear in a run; 6 or higher counts as "well-known". Optional fields:

- `itunesTrackId`: pins the exact recording if the automatic search picks the wrong version. The ID is the `?i=` number in an Apple Music song link.
- `startSeconds`: skips a quiet intro in the preview.
- `audioUrl`: uses your own audio file instead of the Apple preview.

Add new songs anywhere in the list.

Scoring, the run length and the clip limits are in `src/lib/scoring.ts`. The genre buttons are in `src/data/groups.ts`.

## Audio source

Audio comes from the **iTunes Search API's 30-second previews**, which are free and need no API key or account. The browser looks each song up at play time. No audio is downloaded or stored in this repo. The answer screen links back to Apple Music for attribution. See `docs/music-content-and-spotify.md` for the reasoning and caveats.

## Known limits

- The catalog ships inside the frontend bundle, so a determined player could read the answers in dev tools. Moving the catalog behind a small API would fix this if it ever matters.
- Multiplayer rooms aren't built; they would need a server.
- Very short clips (0.1s) depend on the browser starting playback quickly. They work well once the preview has loaded, and the player preloads it.
