# Seasonal songs (parked)

`christmas.json` holds the Christmas songs, **kept out of the game for now**. The game only loads `public/catalog.json`, so nothing in this folder is played.

It has every Christmas song from the artists in the game, plus well-known extras like Pentatonix's "Mary, Did You Know?" and "Little Drummer Boy", Josh Groban's "O Holy Night", Chris Tomlin's "Noel", Whitney Houston and Lauren Daigle. The extras list is `CHRISTMAS_EXTRAS` in `scripts/build-catalog.mjs`. The file uses the same format as the game catalog.

**To bring Christmas back into the game**, rebuild the catalog with the flag. The songs return under a "Christmas" genre that players pick in Run options:

```bash
npm run catalog -- --with-christmas
```

To park them again, run `npm run catalog` without the flag.
