# Spotify integration checkpoint

This repository has **not** been approved by Spotify, and private/personal use does not itself establish permission for a music quiz/game. No Spotify API credentials, playback SDK, catalog harvesting, or audio downloading are implemented.

The prototype supports a manually curated Spotify track ID and displays Spotify's official embedded player **only after the answer is revealed**. The official embed is included as a post-round listening convenience, not used to conceal the answer or provide short song clips. Track names and artwork can be visible in the player, and the embed controls/behavior are governed by Spotify.

Before using Spotify content in this game, verify directly against current Spotify terms and/or obtain written confirmation for the specific use. Confirm whether a quiz/game, staged replay, track metadata, album art, and embeds are each allowed. Do not assume Premium, a private repository, a private deployment, an embed, or not storing audio is equivalent to permission. This code does not bypass restrictions and does not download, cache, trim, or rehost Spotify audio.

## Manual track entry

If and only if you have confirmed the intended use is permitted, add `spotifyTrackId` to a song in `src/data/songs.ts`. Use the 22-character track ID from the Spotify track URI/URL, not an audio URL. Keep the list curated; do not scrape or bulk-copy another game's catalog.

Example shape (placeholder only; not a real track):

```ts
{
  id: 'your-internal-id',
  title: 'Track title',
  artist: 'Artist name',
  hint: 'A brief clue you wrote yourself; do not use lyrics.',
  genres: ['contemporary-worship'],
  spotifyTrackId: '0123456789ABCDEFGHIJKL',
}
```

This setup intentionally does not store Spotify media. The only provider element is Spotify's own iframe embed after the round. For actual staged audio, choose a source that explicitly permits this gameplay and supports short clips/seeking; do not try to work around Spotify embed controls.
