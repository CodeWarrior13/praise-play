# Praise Play

A daily "name that song" game for Christian music. You hear a tiny clip of a song, and each skip or wrong guess unlocks a longer one: **0.5s → 1s → 2s → 4s → 8s → 16s**. You have six tries to find it.

## Features

- **Daily song** that's the same for everyone on a given date and changes at local midnight. No song repeats until the whole catalog for that genre has been used.
- **Genre modes:** All Christian, Worship, Pop & CCM, Rock, Gospel, and Country & Roots. Each mode has its own daily song and its own stats.
- **Unlimited mode** for endless practice with random songs.
- **Searchable guess box** (by title or artist) with keyboard navigation.
- **Reveal screen** with artwork, the full 30-second preview, a link to Apple Music, a shareable emoji result grid, and a countdown to the next song.
- **Stats:** games played, win rate, current and best streaks, and how many seconds you needed. Stored on the device.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Adding songs

Edit `src/data/songs.ts`. Each song needs a unique `id`, `title`, `artist`, and one or more `genres` from `src/data/genres.ts`. Optional fields:

- `itunesTrackId`: pins the exact recording if the automatic search picks the wrong version. The ID is the `?i=` number in an Apple Music song link.
- `startSeconds`: skips a quiet intro in the preview.
- `audioUrl`: uses your own audio file instead of the Apple preview.

Don't change a song's `id` after it has appeared in a daily puzzle. Add new songs anywhere in the list.

To change the clip lengths or the number of tries, edit `CLIP_STAGES` in `src/lib/daily.ts`. To add or change genre modes, edit `src/data/modes.ts`.

## Audio source

Audio comes from the **iTunes Search API's 30-second previews**, which are free and need no API key or account. The browser looks each song up at play time. No audio is downloaded or stored in this repo. The answer screen links back to Apple Music for attribution. See `docs/music-content-and-spotify.md` for the reasoning and caveats.

## Known limits

- The catalog ships inside the frontend bundle, so a determined player could read the answers in dev tools. Moving the catalog behind a small API would fix this if it ever matters.
- Very short clips (0.5s) depend on the browser starting playback quickly. They work well once the preview has loaded, and the player preloads it.
