# Praise Play

A Christian-music song-guessing game. Each song starts at **0.1 seconds** of audio. You decide how much more to hear (up to 30 seconds), and the less you needed, the more points you get.

## How it plays

- **Runs of 5 songs**, ordered from best-known to least-known (Easy → Legend), scored out of 50,000. There's no daily limit.
- **Unlocking more:** drag the logarithmic scrubber, tap the 0.1s, 0.5s, 1s and 3s buttons, or press +1s. The current "worth" updates as you go.
- **Scoring:** 10,000 points at 0.1s, falling steeply at first and reaching 3,000 at the full 30s (`clipWorth` in `src/lib/scoring.ts`). Each wrong guess costs 500, and the song keeps going. Skip reveals the answer and scores 0.
- **Run options:** Hits / Everything / Deep cuts, any mix of 16 genres, up to 60 artists (or one tap for your Spotify top artists), and an era range with decade shortcuts. A narrow pool is still ranked from easy to hard.
- **Today's run:** the same 5 songs for everyone each day, so you can compare scores. Each day can be played once.
- **End of run:** a per-song breakdown, a shareable emoji summary, and your best/average/fastest stats (stored on the device).

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## The song catalog

Songs live in `public/catalog.json`, which is generated, not hand-written.

1. **The roster:** `scripts/artists.mjs` lists about 240 Christian artists, each with genre tags and a fame score (1–10). Artists marked `m` are the player's Spotify top artists. They get a quick "your artists" button in Run options.
2. **The build:** `npm run catalog` asks the iTunes Search API for up to 200 songs per artist. Apple returns them roughly most-popular first. The script merges live/radio/feat. versions into one song, drops instrumentals, remixes, karaoke, foreign-language duplicates and interludes, and keeps the earliest release year. It tags Christmas songs and classic hymns automatically.
3. **Popularity** = artist fame × the song's rank in that artist's list (1–100). This drives Hits / Everything / Deep cuts and the Easy → Legend order within a run.
4. **At play time** the app fetches the 5 songs' previews and album art in one Apple lookup call.

To add artists, add a line to `scripts/artists.mjs` and run:

```bash
npm run catalog
```

Responses are cached in `scripts/.cache/`, so re-runs only fetch new artists (`-- --fresh` re-downloads everything). Behind a corporate proxy, set `NODE_USE_ENV_PROXY=1`. The script waits about 3 seconds between requests to stay within Apple's rate limit, so a full fresh build takes about 15 minutes.

## Themes

The palette button in the header switches between six themes (Sanctuary, Aurora, Ember, Deep Water, Midnight Gold, Dawn). The choice is remembered on the device. Themes are just sets of CSS variables in `src/lib/theme.ts`, so adding one is a single object.

## Known limits

- The catalog is a public JSON file, so a determined player could look up answers. Moving it behind a small API would fix that if it ever matters.
- Spotify can't be the audio source: its API no longer serves previews to new apps, and the Spotify connector can't list a playlist's tracks. Spotify was used to find your top artists, which seeded the roster.
- Multiplayer rooms aren't built; they would need a server.
- Very short clips (0.1s) depend on the browser starting playback quickly. They work well once the preview has loaded, and the player preloads it.
