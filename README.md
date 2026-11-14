# Praise Play

A Christian-music song-guessing game. Each song starts at **0.1 seconds** of audio. You decide how much more to hear (up to 30 seconds), and the less you needed, the more points you get.

## How it plays

- **Four ways to play:** a 5-song run, **Endless** (songs keep coming and get harder; skipping costs one of 3 lives), **Daily** (the same 5 songs for everyone), and **Friends** (private multiplayer rooms).
- **Multiplayer:** the host creates a room and shares a 5-letter code or invite link (`?room=CODE`). Up to 30 players hear the same song at the same time, 45 seconds per song, scored like solo. The host picks the songs (**Full Catalog**, **Popular Picks** or **Assorted Playlist**), 5/10/15/20 songs or **Endless** (3 lives each; a skip or running out of time costs one; players who are out spectate; the game ends when everyone is out or the host ends it), and a difficulty: **Mixed** (hits to deep cuts), **Easy**, **Hard**, **Extreme** or **Impossible**. Invite friends with Copy code, Copy invite link, the phone share sheet, or a QR code (hidden until you open it). After each song everyone sees the answer, the round results and the leaderboard; the game ends with a podium, and the host can start another game with the same group. It runs peer-to-peer over WebRTC: the host's browser runs the room, PeerJS's free public broker introduces the players, and PeerJS's relay servers step in when networks block direct connections. No server or account is needed. To use your own broker, build with `VITE_PEER_HOST`, `VITE_PEER_PORT`, `VITE_PEER_PATH` and `VITE_PEER_SECURE`.
- **Runs of 5 songs**, ordered from best-known to least-known (Easy → Legend), scored out of 50,000. There's no daily limit.
- **Unlocking more:** drag the logarithmic scrubber, tap the 0.1s, 0.5s, 1s and 3s buttons, or press +1s. The current "worth" updates as you go.
- **Scoring:** 10,000 points at 0.1s, falling steeply at first and reaching 3,000 at the full 30s (`clipWorth` in `src/lib/scoring.ts`). Each wrong guess costs 500, and the song keeps going. Skip reveals the answer and scores 0.
- **Run options:** Hits / Everything / Deep cuts, any mix of 16 genres, up to 60 artists (or one tap for your Spotify top artists), and an era range with decade shortcuts. A narrow pool is still ranked from easy to hard.
- **No silent openings:** each preview is analysed in the browser (`src/lib/onset.ts`) and clips start where the music actually begins, skipping quiet intros of up to 15 seconds.
- **Hints (optional):** a 💡 button reveals clues only when tapped: release year and genre (−500), the artist's first letter and title length (−1,000), then the artist (−1,500).
- **Global leaderboard:** finish a solo 5-song run with a top-50 score to post it to the Today and All-time boards (🏆 in the header). Scores are stored with Netlify Blobs by a Netlify Function (`netlify/functions/leaderboard.mts`), which re-scores every run from the per-song details. It runs automatically on Netlify; nothing to configure.
- **Guessing:** search by song or artist. Results show album covers, and typing an artist's name lists their songs. Start typing anywhere to search; On desktop: just start typing to search (any letter, including A, D and H). `Space` plays; a single quick tap of `A` replays, `D` adds a second, and `H` opens help (which pauses the game). `←`/`→` also replay and add a second.
- **After each song:** the cover slides out of a spinning record, with "hear the full song" buttons for Apple Music and Spotify (also on every row of the results screen), the song keeps playing, and you see how much you heard, how long you took, and your wrong guesses. If a preview is ever missing, the game swaps in another song of the same difficulty, with no penalty.
- **End of run:** a per-song breakdown, a shareable emoji summary, and your best/average/fastest stats (stored on the device).

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Putting it online

The repository builds a plain static site (`npm run build` → `dist/`). Two ready-made ways to host it:

**Option A: GitHub Pages** (needs a public repo, or GitHub Pro on a private one)

1. Repository **Settings → General → Danger Zone → Change visibility → Public** (skip if you have GitHub Pro).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (or push any commit to `main`).
4. When the run is green, the game is at `https://codewarrior13.github.io/praise-play/`. Every push to `main` redeploys it.

**Option B: Netlify** (free, works with a private repo)

1. Sign in at netlify.com with GitHub → **Add new site → Import an existing project → GitHub**.
2. Allow Netlify access to `praise-play` and pick it. The settings are read from `netlify.toml` (build `npm run build`, publish `dist`), so just click **Deploy**.
3. The game is live at the `*.netlify.app` address Netlify shows; rename it under **Site configuration → Change site name**. Every push to `main` redeploys it.

## The song catalog

Songs live in `public/catalog.json`, which is generated, not hand-written.

1. **The roster:** `scripts/artists.mjs` lists about 300 English-language Christian artists, each with genre tags (or `auto`) and a fame score (1–10).
1. **Your playlists:** `scripts/playlist-songs.json` holds the ~700 songs from your Spotify playlists. Every one is matched or looked up on Apple Music and flagged, so Run options can limit a game to the "Assorted Playlist" (those songs) or "Popular Picks" (everything by those artists).
2. **The build:** `npm run catalog` asks the iTunes Search API for up to 200 songs per artist. Apple returns them roughly most-popular first. The script merges live/radio/feat. versions into one song, drops instrumentals, remixes, karaoke, foreign-language duplicates and interludes, and keeps the earliest release year. It tags Christmas songs and classic hymns automatically, and keeps the catalog English-only (Spanish/Portuguese titles and versions are dropped; English songs with foreign-language titles like "El Shaddai" stay).
3. **Popularity** = artist fame × the song's rank in that artist's list (1–100). This drives Hits / Everything / Deep cuts and the Easy → Legend order within a run.
4. **At play time** the app fetches the 5 songs' previews and album art in one Apple lookup call.

To add artists or songs, edit those files and run:

```bash
npm run catalog
```

Then check every song still has a playable preview (this removes any that don't, and spot-checks real audio and cover downloads):

```bash
npm run verify
```

Responses are cached in `scripts/.cache/`, so re-runs only fetch new artists (`-- --fresh` re-downloads everything). Behind a corporate proxy, set `NODE_USE_ENV_PROXY=1`. The script waits about 3 seconds between requests to stay within Apple's rate limit, so a full fresh build takes about 15 minutes.

## Themes

The palette button in the header switches between seven themes (Sanctuary, Aurora, Ember, Deep Water, Evergreen, Midnight Gold, Dawn). The choice is remembered on the device. Themes are just sets of CSS variables in `src/lib/theme.ts`, so adding one is a single object.

## Known limits

- The catalog is a public JSON file, so a determined player could look up answers. Moving it behind a small API would fix that if it ever matters.
- Spotify can't be the audio source: its API no longer serves previews to new apps, and the Spotify connector can't list a playlist's tracks. Spotify was used to find your top artists, which seeded the roster.
- Multiplayer rooms aren't built; they would need a server.
- Very short clips (0.1s) depend on the browser starting playback quickly. They work well once the preview has loaded, and the player preloads it.
