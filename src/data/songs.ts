import type { GenreId } from './genres'

export type Song = {
  /** Stable internal identifier; never change it once a song has been used in a daily puzzle. */
  id: string
  title: string
  artist: string
  /** One or more tags from genres.ts; multiple tags are allowed. */
  genres: GenreId[]
  year?: number
  /** Optional: pin the exact Apple Music / iTunes track so the right recording is used. */
  itunesTrackId?: number
  /** Optional: an audio file you own/are licensed to use. Overrides the preview lookup. */
  audioUrl?: string
  /** Where in the clip to start (seconds). Useful when a preview opens with silence. */
  startSeconds?: number
}

const s = (
  id: string,
  title: string,
  artist: string,
  genres: GenreId[],
  year?: number,
  extra: Partial<Song> = {},
): Song => ({ id, title, artist, genres, year, ...extra })

/**
 * The catalog. Order does not matter — daily songs are drawn from a seeded shuffle.
 * Add new songs at the end and keep IDs unique.
 */
export const songs: Song[] = [
  // Contemporary worship
  s('way-maker', 'Way Maker', 'Leeland', ['contemporary-worship'], 2019),
  s('goodness-of-god', 'Goodness of God', 'Bethel Music', ['contemporary-worship'], 2019),
  s('build-my-life', 'Build My Life', 'Housefires', ['contemporary-worship'], 2016),
  s('what-a-beautiful-name', 'What a Beautiful Name', 'Hillsong Worship', ['contemporary-worship'], 2016),
  s('oceans', 'Oceans (Where Feet May Fail)', 'Hillsong UNITED', ['contemporary-worship'], 2013),
  s('10000-reasons', '10,000 Reasons (Bless the Lord)', 'Matt Redman', ['contemporary-worship'], 2011),
  s('reckless-love', 'Reckless Love', 'Cory Asbury', ['contemporary-worship'], 2017),
  s('graves-into-gardens', 'Graves Into Gardens', 'Elevation Worship', ['contemporary-worship'], 2020),
  s('do-it-again', 'Do It Again', 'Elevation Worship', ['contemporary-worship'], 2017),
  s('raise-a-hallelujah', 'Raise a Hallelujah', 'Bethel Music', ['contemporary-worship'], 2019),
  s('how-great-is-our-god', 'How Great Is Our God', 'Chris Tomlin', ['contemporary-worship'], 2004),
  s('good-good-father', 'Good Good Father', 'Chris Tomlin', ['contemporary-worship'], 2015),
  s('holy-forever', 'Holy Forever', 'Chris Tomlin', ['contemporary-worship'], 2022),
  s('gratitude', 'Gratitude', 'Brandon Lake', ['contemporary-worship'], 2022),
  s('praise', 'Praise', 'Elevation Worship', ['contemporary-worship'], 2023),
  s('firm-foundation', "Firm Foundation (He Won't)", 'Cody Carnes', ['contemporary-worship'], 2021),
  s('living-hope', 'Living Hope', 'Phil Wickham', ['contemporary-worship'], 2018),
  s('this-is-amazing-grace', 'This Is Amazing Grace', 'Phil Wickham', ['contemporary-worship'], 2013),
  s('battle-belongs', 'Battle Belongs', 'Phil Wickham', ['contemporary-worship'], 2020),
  s('king-of-kings', 'King of Kings', 'Hillsong Worship', ['contemporary-worship'], 2019),
  s('who-you-say-i-am', 'Who You Say I Am', 'Hillsong Worship', ['contemporary-worship'], 2018),
  s('cornerstone', 'Cornerstone', 'Hillsong Worship', ['contemporary-worship', 'hymns'], 2012),
  s('great-are-you-lord', 'Great Are You Lord', 'All Sons & Daughters', ['contemporary-worship'], 2013),
  s('the-blessing', 'The Blessing', 'Kari Jobe', ['contemporary-worship'], 2020),
  s('run-to-the-father', 'Run to the Father', 'Cody Carnes', ['contemporary-worship'], 2020),
  s('see-a-victory', 'See A Victory', 'Elevation Worship', ['contemporary-worship'], 2019),
  s('holy-water', 'Holy Water', 'We The Kingdom', ['contemporary-worship', 'christian-pop'], 2019),
  s('whom-shall-i-fear', 'Whom Shall I Fear (God of Angel Armies)', 'Chris Tomlin', ['contemporary-worship'], 2012),

  // Christian pop / CCM
  s('i-can-only-imagine', 'I Can Only Imagine', 'MercyMe', ['christian-pop'], 2001),
  s('even-if', 'Even If', 'MercyMe', ['christian-pop'], 2017),
  s('flawless', 'Flawless', 'MercyMe', ['christian-pop'], 2014),
  s('you-say', 'You Say', 'Lauren Daigle', ['christian-pop'], 2018),
  s('rescue', 'Rescue', 'Lauren Daigle', ['christian-pop'], 2019),
  s('lord-i-need-you', 'Lord, I Need You', 'Matt Maher', ['christian-pop', 'contemporary-worship'], 2013),
  s('blessings', 'Blessings', 'Laura Story', ['christian-pop'], 2011),
  s('redeemed', 'Redeemed', 'Big Daddy Weave', ['christian-pop'], 2012),
  s('voice-of-truth', 'Voice of Truth', 'Casting Crowns', ['christian-pop'], 2003),
  s('who-am-i', 'Who Am I', 'Casting Crowns', ['christian-pop'], 2003),
  s('praise-you-in-this-storm', 'Praise You in This Storm', 'Casting Crowns', ['christian-pop'], 2005),
  s('scars-in-heaven', 'Scars in Heaven', 'Casting Crowns', ['christian-pop'], 2021),
  s('god-only-knows', 'God Only Knows', 'for KING & COUNTRY', ['christian-pop'], 2018),
  s('joy', 'joy.', 'for KING & COUNTRY', ['christian-pop'], 2018),
  s('overcomer', 'Overcomer', 'Mandisa', ['christian-pop'], 2013),
  s('hello-my-name-is', 'Hello, My Name Is', 'Matthew West', ['christian-pop'], 2012),
  s('do-something', 'Do Something', 'Matthew West', ['christian-pop'], 2014),
  s('gold', 'Gold', 'Britt Nicole', ['christian-pop'], 2012),
  s('truth-im-standing-on', "Truth I'm Standing On", 'Leanna Crawford', ['christian-pop'], 2021),
  s('look-what-youve-done', "Look What You've Done", 'Tasha Layton', ['christian-pop'], 2021),
  s('hold-us-together', 'Hold Us Together', 'Matt Maher', ['christian-pop'], 2009),

  // Hip-hop & R&B
  s('feel-it', 'Feel It', 'TobyMac', ['christian-hip-hop', 'christian-pop'], 2015),
  s('me-without-you', 'Me Without You', 'TobyMac', ['christian-hip-hop', 'christian-pop'], 2015),
  s('i-just-need-u', 'I just need U.', 'TobyMac', ['christian-hip-hop', 'christian-pop'], 2018),
  s('ill-find-you', "I'll Find You", 'Lecrae', ['christian-hip-hop'], 2017),
  s('you-cant-stop-me', "You Can't Stop Me", 'Andy Mineo', ['christian-hip-hop'], 2014),

  // Rock & alternative
  s('jesus-freak', 'Jesus Freak', 'dc Talk', ['christian-rock'], 1995),
  s('monster', 'Monster', 'Skillet', ['christian-rock'], 2009),
  s('hero', 'Hero', 'Skillet', ['christian-rock'], 2009),
  s('awake-and-alive', 'Awake and Alive', 'Skillet', ['christian-rock'], 2009),
  s('dare-you-to-move', 'Dare You to Move', 'Switchfoot', ['christian-rock', 'christian-indie'], 2003),
  s('meant-to-live', 'Meant to Live', 'Switchfoot', ['christian-rock', 'christian-indie'], 2003),
  s('gods-not-dead', "God's Not Dead (Like a Lion)", 'Newsboys', ['christian-rock', 'contemporary-worship'], 2011),
  s('flood', 'Flood', 'Jars of Clay', ['christian-rock', 'christian-indie'], 1995),
  s('be-my-escape', 'Be My Escape', 'Relient K', ['christian-rock', 'christian-punk'], 2004),
  s('breathe-into-me', 'Breathe Into Me', 'Red', ['christian-rock', 'christian-metal'], 2006),
  s('courtesy-call', 'Courtesy Call', 'Thousand Foot Krutch', ['christian-rock'], 2012),
  s('strong-tower', 'Strong Tower', 'Kutless', ['christian-rock', 'contemporary-worship'], 2005),
  s('alive-pod', 'Alive', 'P.O.D.', ['christian-rock'], 2001),
  s('fear-is-a-liar', 'Fear Is a Liar', 'Zach Williams', ['christian-rock'], 2017),
  s('chain-breaker', 'Chain Breaker', 'Zach Williams', ['christian-rock'], 2016),
  s('beautiful-things', 'Beautiful Things', 'Gungor', ['christian-indie'], 2010),
  s('my-lighthouse', 'My Lighthouse', 'Rend Collective', ['christian-folk', 'contemporary-worship'], 2014),

  // Gospel
  s('stomp', 'Stomp', 'Kirk Franklin', ['gospel'], 1997),
  s('i-smile', 'I Smile', 'Kirk Franklin', ['gospel'], 2011),
  s('love-theory', 'Love Theory', 'Kirk Franklin', ['gospel'], 2019),
  s('break-every-chain', 'Break Every Chain', 'Tasha Cobbs Leonard', ['gospel'], 2013),
  s('believe-for-it', 'Believe For It', 'CeCe Winans', ['gospel'], 2021),
  s('no-weapon', 'No Weapon', 'Fred Hammond', ['gospel'], 1996),
  s('never-would-have-made-it', 'Never Would Have Made It', 'Marvin Sapp', ['gospel'], 2007),
  s('we-fall-down', 'We Fall Down', 'Donnie McClurkin', ['gospel'], 2000),
  s('every-praise', 'Every Praise', 'Hezekiah Walker', ['gospel'], 2013),
  s('intentional', 'Intentional', 'Travis Greene', ['gospel'], 2015),
  s('promises', 'Promises', 'Maverick City Music', ['gospel', 'contemporary-worship'], 2020),
  s('jireh', 'Jireh', 'Elevation Worship', ['contemporary-worship', 'gospel'], 2021),

  // Hymns (modern recordings)
  s('in-christ-alone', 'In Christ Alone', 'Keith & Kristyn Getty', ['hymns'], 2001),
  s('amazing-grace-my-chains', 'Amazing Grace (My Chains Are Gone)', 'Chris Tomlin', ['hymns', 'contemporary-worship'], 2006),
  s('how-great-thou-art', 'How Great Thou Art', 'Carrie Underwood', ['hymns', 'christian-country'], 2014),
  s('it-is-well', 'It Is Well', 'Bethel Music', ['hymns', 'contemporary-worship'], 2014),
  s('because-he-lives', 'Because He Lives', 'Gaither Vocal Band', ['hymns', 'southern-gospel']),

  // Country
  s('jesus-take-the-wheel', 'Jesus, Take the Wheel', 'Carrie Underwood', ['christian-country'], 2005),
  s('long-black-train', 'Long Black Train', 'Josh Turner', ['christian-country'], 2003),
  s('three-wooden-crosses', 'Three Wooden Crosses', 'Randy Travis', ['christian-country'], 2002),
  s('there-was-jesus', 'There Was Jesus', 'Zach Williams', ['christian-country'], 2019),

  // Latin
  s('renuevame', 'Renuévame', 'Marcos Witt', ['christian-latin']),
  s('sumergeme', 'Sumérgeme', 'Jesús Adrián Romero', ['christian-latin']),

  // Holiday
  s('mary-did-you-know', 'Mary, Did You Know?', 'Pentatonix', ['holiday'], 2014),
  s('light-of-the-world', 'Light of the World', 'Lauren Daigle', ['holiday', 'christian-pop'], 2014),
]
