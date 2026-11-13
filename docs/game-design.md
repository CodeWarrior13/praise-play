# Game rules and genre groundwork

## Current prototype rules

- One daily answer is selected deterministically from the chosen genre's catalog and the UTC date.
- The first listening stage is 1 second. The staged progression is **1s → 3s → 5s → 10s → 15s**.
- Guessing is unlimited within a stage. An incorrect guess advances to the next stage.
- Skip advances a stage without a guess. At the final stage, a wrong guess or skip reveals the answer and awards zero points.
- A correct answer scores **1000, 800, 600, 400, or 200 points**, respectively, depending on the stage. These are original, configurable starting values, not copied from another game's scoring table.
- The answer and correct choice are revealed only after the round ends. No game state is stored between page loads in this prototype.
- Genre selection uses one broad tag at a time; each song can have multiple tags. Very small genre pools are expected until you add more catalog entries.

## Audio-source constraint

These stages currently model the game rules; the app does **not** play staged audio. Spotify's official embed is only displayed after the answer is revealed, if a curated Spotify track ID is present. The embed is an official Spotify player, not an audio file hosted by this app. It does not give the app control to crop playback to 1/3/5/10/15-second segments, guarantee a particular starting offset, or hide player information during the mystery round. Do not claim the clip progression works until an audio source explicitly permits and technically supports it.

## Genre approach

Start with broad categories in `src/data/genres.ts`, allow multiple tags per song, and keep `other` as a fallback. Only add a narrow subgenre when your library has enough tracks for a satisfying round. A later mode can offer genre groups (Worship & Gospel, Rock & Alternative, Pop & Urban, Roots & Global, Other). Tags describe musical style, not theological judgments.
