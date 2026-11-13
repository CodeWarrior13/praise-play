# Music content and Spotify: permission checkpoint

This app is private by intent, but private/personal use does **not** by itself prove that Spotify permits a music-guessing game or that API access grants music/game rights. Earlier advice in this project conversation suggesting that Spotify had approved this use was too confident; no approval has been obtained.

Spotify's developer terms and policies can change. Before building a Spotify-backed quiz, ask Spotify directly whether this specific private song-guessing/game use is allowed under the current terms and whether any separate music rights are needed. Do not treat an API key, Developer Mode access, Premium subscription, an embed, or a track ID as permission for game use.

Also verify current API availability before designing around previews. Preview URLs have changed over time and may not be returned to new apps. Do not download, cache, rehost, trim, or extract Spotify audio. Use only a Spotify-provided playback method and presentation that Spotify explicitly permits for the approved use. Album artwork and metadata have their own display/attribution requirements; follow current official documentation.

## Before connecting a provider

- [ ] Confirm the exact game use with Spotify/rights holder and save the written response.
- [ ] Confirm whether preview playback, staged replay, seeking, artwork, and metadata display are each permitted.
- [ ] Confirm the current Developer Mode user limits, account requirements, API access, and any approval process in official docs.
- [ ] If Spotify does not approve the gameplay, choose audio you own or a source with a license that explicitly permits this use.
- [ ] Keep client secrets on a server and out of Git/frontend bundles. Use environment variables and a local `.env` excluded from version control.
- [ ] Only import tracks you personally curate or otherwise have permission to use; don't scrape a game/site or bulk-copy a catalog.

No Spotify credentials or integration code are included in this repository. This document is implementation guidance, not legal advice.

## Current choice: Apple / iTunes previews

The game now uses the public iTunes Search API to find each song's 30-second preview at play time (`src/lib/preview.ts`). This was chosen because:

- It needs no API key, account, or server, so no secrets are involved.
- Spotify no longer returns preview URLs to new apps, so a Spotify-based clip game isn't practical anyway.
- Audio streams straight from Apple's servers. Nothing is downloaded, re-hosted, or cut into files.
- The answer screen credits the track and links to it on Apple Music.

Apple's preview terms are written with promotion and linking in mind. A private game that credits and links each track is a common use of them, but it isn't explicitly approved. If you ever make the game public or earn money from it, check Apple's current Affiliate and API terms first. You can also move to audio you own by setting `audioUrl` on each song.
