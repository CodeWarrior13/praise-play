# Game design groundwork

## Round loop

- A run is 5 songs. The filtered pool is ranked by `popularity` and split into 5 bands, and one song is drawn from each band, so runs go from easy to hard.
- Each song starts with 0.1s unlocked. The player can unlock more at any time, up to the full 30-second preview, using a logarithmic scrubber or the jump buttons. Unlocking only goes forward.
- A song is worth `clipWorth(unlocked)`: 10,000 at 0.1s, falling on a convex curve against log-time to 3,000 at 30s. Each wrong guess costs 500 (minimum 0). Skip scores 0.
- Guesses come from the whole catalog, not just the filtered pool, so the filters don't give the answer away. A recording with the same title also counts as correct.
- Today's run uses the same seed for everyone, based on the local date.

## Genre approach

Christian music spans many overlapping styles. Start with the broad tags in `src/data/genres.ts`, permit multiple tags per song, and keep `other` as a safe fallback. Add a genre only when the catalog has enough songs to support a fun mode. Later, genre mode can offer a few broad groups (Worship & Gospel, Rock & Alternative, Pop & Urban, Roots & Global, Other) instead of presenting a long list of microgenres.

Genre data should describe sound/style, not make theological judgments. Optionally add separate catalog fields such as language, decade, mood, or worship-context if those become useful.

## Suggested song record

Each real record should have a stable ID, title, artist, genre tags, a provider track ID, a concise non-lyric clue, and a provider-approved playback reference. Track whether the track and its artwork are actually usable in this game; a public API search result alone is not proof of permission.
