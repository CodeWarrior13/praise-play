# Game design groundwork

## Round loop

The game can use a staged-reveal loop: play a short segment, allow a guess or skip, then unlock a longer segment. A reasonable *starting proposal* is 1, 3, 5, 10, and 15 seconds, with a final reveal/answer step. Tune these values only after choosing an audio provider that permits this use and supports reliable playback/seeking. Very tiny clips (for example 0.1 seconds) are difficult to hear, may be rounded by browsers, and should not be assumed to work consistently.

Suggested round rules:

- One song per daily puzzle; optional genre mode can filter the eligible catalog before choosing the daily song.
- A wrong guess or an explicit skip advances one stage. Replaying the currently unlocked segment does not.
- Guessing remains unlimited within the current stage; this keeps the game accessible and avoids punishing spelling/selection mistakes.
- The answer is shown after a correct guess or the final reveal.
- Score can be based on the stage at which the answer is found; keep scoring separate from the puzzle-selection logic.
- Store local progress by date and game mode. For cross-device consistency, the puzzle assignment must eventually come from a server or a shared seed/catalog version.

These are original design recommendations, not a claim about the target site's current rules. Don't copy its branding, source code, catalog, or recordings.

## Genre approach

Christian music spans many overlapping styles. Start with the broad tags in `src/data/genres.ts`, permit multiple tags per song, and keep `other` as a safe fallback. Add a genre only when the catalog has enough songs to support a fun mode. Later, genre mode can offer a few broad groups (Worship & Gospel, Rock & Alternative, Pop & Urban, Roots & Global, Other) instead of presenting a long list of microgenres.

Genre data should describe sound/style, not make theological judgments. Optionally add separate catalog fields such as language, decade, mood, or worship-context if those become useful.

## Suggested song record

Each real record should have a stable ID, title, artist, genre tags, a provider track ID, a concise non-lyric clue, and a provider-approved playback reference. Track whether the track and its artwork are actually usable in this game; a public API search result alone is not proof of permission.
