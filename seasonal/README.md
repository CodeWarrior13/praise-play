# Seasonal songs (parked)

`christmas.json` holds the Christmas songs, **kept out of the game for now**. The game only loads `public/catalog.json`, so nothing in this folder is played.

It's a hand-picked list of the famous Christmas songs, **each song once, in its best-known version**, with no stack of covers by different artists. Examples:

- Mariah Carey: "All I Want for Christmas Is You"
- Bing Crosby: "White Christmas"
- Brenda Lee: "Rockin' Around the Christmas Tree"
- The Ronettes: "Sleigh Ride"
- Dean Martin: "Baby, It's Cold Outside"
- Gayla Peevey: "I Want a Hippopotamus for Christmas"
- Pentatonix: "Mary, Did You Know?", "Little Drummer Boy", "Hallelujah" and "Carol of the Bells"
- The best-loved Christian ones: Josh Groban's "O Holy Night", Chris Tomlin's "Noel", Lauren Daigle's "Light of the World"

The list is `CHRISTMAS_SONGS` in `scripts/build-catalog.mjs`. Add or swap a song there, and if two picks ever share a title, only the more popular one is kept.

**To bring Christmas back into the game**, rebuild the catalog with the flag. The songs return under a "Christmas" genre that players pick in Run options:

```bash
npm run catalog -- --with-christmas
```

To park them again, run `npm run catalog` without the flag.
