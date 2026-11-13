/**
 * The artist roster the catalog is built from.
 * Format per line:  Artist name | genre ids (comma-separated) | fame 1–10 | flags
 *   fame   how widely known the artist is; sets how "easy" their hits are.
 *   flags  m = one of your Spotify top artists, i = instrumental artist (keep piano/instrumental tracks)
 * Genre ids must exist in GENRES below.
 */
export const GENRES = {
  worship: 'Worship',
  ccm: 'Pop & CCM',
  hiphop: 'Hip-Hop',
  gospel: 'Gospel',
  rock: 'Rock',
  metal: 'Metal & Hardcore',
  indie: 'Indie & Alt',
  folk: 'Folk & Acoustic',
  country: 'Country',
  rnb: 'R&B & Soul',
  southern: 'Southern Gospel',
  hymns: 'Hymns',
  latin: 'Latin',
  electronic: 'Electronic',
  instrumental: 'Instrumental & Lo-Fi',
  christmas: 'Christmas',
}

const roster = `
Elevation Worship | worship | 10 | m
Bethel Music | worship | 10 | m
Hillsong Worship | worship | 9 | m
Hillsong UNITED | worship | 9 | m
Passion | worship | 7 | m
ZOE Music | worship | 5 | m
SEU Worship | worship | 5 | m
Gateway Worship | worship | 5 | m
ELEVATION RHYTHM | worship,ccm | 5 | m
Rend Collective | folk,worship | 6 | m
Josiah Queen | folk,ccm | 7 | m
Casting Crowns | ccm | 9 | m
TobyMac | ccm,hiphop | 9 | m
Tauren Wells | ccm | 8 | m
for KING & COUNTRY | ccm | 9 | m
KB | hiphop | 6 | m
Hulvey | hiphop | 5 | m
gio. | instrumental | 4 | mi
May the Lord Studio | instrumental | 3 | mi
Strings & Heart | instrumental | 3 | mi
Maverick City Music | worship,gospel | 9
Chris Tomlin | worship | 9
Phil Wickham | worship | 9
Brandon Lake | worship | 9
Cody Carnes | worship | 7
Kari Jobe | worship | 7
Matt Redman | worship | 6
Jesus Culture | worship | 6
Housefires | worship | 6
Leeland | worship | 6
Pat Barrett | worship | 5
Chandler Moore | worship,gospel | 6
Jenn Johnson | worship | 5
UPPERROOM | worship | 6
Vertical Worship | worship | 5
Red Rocks Worship | worship | 5
CityAlight | worship,hymns | 6
Shane & Shane | worship,hymns | 6
Kristian Stanfill | worship | 4
Planetshakers | worship | 5
Hillsong Young & Free | worship,electronic | 6
Cory Asbury | worship | 6
Josh Baldwin | worship | 4
Steffany Gretzinger | worship | 4
We The Kingdom | worship,ccm | 7
Matt Maher | worship,ccm | 6
Crowder | worship,folk | 8
Kim Walker-Smith | worship | 5
Brooke Ligertwood | worship | 5
Charity Gayle | worship | 6
Benjamin William Hastings | worship | 5
Dante Bowe | worship,gospel | 5
Naomi Raine | worship,gospel | 4
Phil Thompson | worship,gospel | 5
Bryan & Katie Torwalt | worship | 4
Jeremy Riddle | worship | 4
North Point Worship | worship | 4
Mosaic MSC | worship | 4
Influence Music | worship | 4
Sean Feucht | worship | 4
TAYA | worship | 4
Stephen McWhirter | worship | 4
Jon Reddick | worship | 4
All Sons & Daughters | worship,indie | 4
Delirious? | worship,rock | 5
Lauren Daigle | ccm | 9
MercyMe | ccm | 9
Zach Williams | ccm,rock,country | 8
Matthew West | ccm | 8
Jeremy Camp | ccm,rock | 8
Newsboys | ccm,rock | 7
Danny Gokey | ccm | 6
Big Daddy Weave | ccm | 6
Francesca Battistelli | ccm | 6
Mandisa | ccm | 5
Anne Wilson | ccm,country | 7
CAIN | ccm | 6
Jordan Feliz | ccm | 6
Colton Dixon | ccm | 5
Natalie Grant | ccm | 5
Third Day | ccm,rock | 7
Steven Curtis Chapman | ccm | 6
Michael W. Smith | ccm,worship | 7
Amy Grant | ccm | 6
Chris August | ccm | 4
Building 429 | ccm | 5
Sidewalk Prophets | ccm | 6
Unspoken | ccm | 5
Laura Story | ccm | 5
Plumb | ccm | 5
Britt Nicole | ccm | 6
David Dunn | ccm | 5
Riley Clemmons | ccm | 5
Katy Nichole | ccm | 6
Leanna Crawford | ccm | 5
Blessing Offor | ccm,rnb | 5
Seph Schlueter | ccm | 6
Austin French | ccm | 5
Tasha Layton | ccm,worship | 5
Ryan Stevenson | ccm | 5
Micah Tyler | ccm | 4
We Are Messengers | ccm | 5
Tenth Avenue North | ccm,rock | 6
Hawk Nelson | ccm,rock | 5
Sanctus Real | ccm,rock | 5
Brandon Heath | ccm | 4
Jordan St. Cyr | ccm | 4
Cochren & Co. | ccm | 3
Forrest Frank | ccm,hiphop | 8
Hollyn | ccm,electronic | 4
Avalon | ccm | 4
Point of Grace | ccm | 4
Phillips, Craig & Dean | ccm,worship | 4
4Him | ccm | 3
Twila Paris | ccm | 3
Sandi Patty | ccm | 3
Rich Mullins | ccm,folk | 4
Keith Green | ccm | 4
dc Talk | ccm,rock,hiphop | 6
Audio Adrenaline | rock | 5
Lecrae | hiphop | 8
Andy Mineo | hiphop | 6
Trip Lee | hiphop | 5
116 | hiphop | 5
Tedashii | hiphop | 4
Social Club Misfits | hiphop | 5
Wande | hiphop | 4
Aaron Cole | hiphop | 4
GAWVI | hiphop,electronic | 4
Derek Minor | hiphop | 4
Miles Minnick | hiphop | 4
Caleb Gordon | hiphop | 4
Torey D'Shaun | hiphop | 4
nobigdyl. | hiphop | 4
1K Phew | hiphop | 4
Bizzle | hiphop | 3
Swoope | hiphop,electronic | 3
Manafest | hiphop,rock | 4
Skillet | rock | 9
Switchfoot | rock,indie | 7
Red | rock,metal | 6
Thousand Foot Krutch | rock | 6
P.O.D. | rock,metal | 7
Disciple | rock,metal | 4
Kutless | rock,worship | 5
Relient K | rock,indie | 6
Family Force 5 | rock | 4
NEEDTOBREATHE | rock,folk | 7
Petra | rock | 3
Stryper | metal | 4
Flyleaf | rock | 5
Fireflight | rock | 3
Seventh Day Slumber | rock | 3
We As Human | rock | 3
Ashes Remain | rock | 4
Superchick | rock | 4
Demon Hunter | metal | 5
August Burns Red | metal | 5
Underoath | metal | 6
Wolves At the Gate | metal | 3
For Today | metal | 3
Jars of Clay | indie,rock | 5
Gungor | indie | 4
The Brilliance | indie | 3
John Mark McMillan | indie,worship | 4
Jon Foreman | indie,folk | 4
Colony House | indie | 4
Chris Renzema | indie,folk | 5
Josh Garrels | folk,indie | 4
Ellie Holcomb | folk | 4
I AM THEY | folk,ccm | 4
Andrew Peterson | folk | 3
Audrey Assad | folk,hymns | 4
Ben Fuller | country,ccm | 5
Rhett Walker | country,ccm | 4
Mac Powell | country | 4
Jason Crabb | southern,country | 4
Gaither Vocal Band | southern | 4
Bill & Gloria Gaither | southern | 3
The Isaacs | southern,folk | 3
Ernie Haase & Signature Sound | southern | 3
Karen Peck & New River | southern | 3
The Booth Brothers | southern | 3
Triumphant Quartet | southern | 3
The Hoppers | southern | 3
Keith & Kristyn Getty | hymns | 5
Kirk Franklin | gospel | 8
CeCe Winans | gospel | 8
Tasha Cobbs Leonard | gospel | 7
Marvin Sapp | gospel | 6
Fred Hammond | gospel | 6
Donnie McClurkin | gospel | 5
Tye Tribbett | gospel | 6
Travis Greene | gospel | 6
Mary Mary | gospel | 6
Hezekiah Walker | gospel | 5
Israel & New Breed | gospel | 5
William McDowell | gospel | 5
Jonathan McReynolds | gospel,rnb | 6
Koryn Hawthorne | gospel,rnb | 6
Jekalyn Carr | gospel | 5
Tamela Mann | gospel | 5
Yolanda Adams | gospel,rnb | 6
Smokie Norful | gospel | 5
Richard Smallwood | gospel | 4
James Fortune | gospel | 5
Erica Campbell | gospel | 5
Anthony Brown & group therAPy | gospel | 5
Todd Dulaney | gospel | 5
Pastor Mike Jr. | gospel | 5
Zacardi Cortez | gospel | 4
Ricky Dillard | gospel | 4
Jason Nelson | gospel | 4
VaShawn Mitchell | gospel | 4
Donald Lawrence | gospel | 4
Sinach | gospel,worship | 6
Nathaniel Bassey | gospel,worship | 5
Mercy Chinwo | gospel | 5
Dunsin Oyekan | gospel,worship | 4
Mali Music | rnb,gospel | 5
Brian Courtney Wilson | gospel,rnb | 5
Kierra Sheard | gospel,rnb | 5
BeBe Winans | gospel,rnb | 4
Anthony Evans | rnb,worship | 4
Marcos Witt | latin | 5
Jesús Adrián Romero | latin | 5
Marco Barrientos | latin | 4
Christine D'Clario | latin | 5
Evan Craft | latin | 4
Barak | latin | 4
Danilo Montero | latin | 4
Marcela Gándara | latin | 4
Miel San Marcos | latin | 6
Generación 12 | latin | 4
Alex Campos | latin | 5
Redimi2 | latin,hiphop | 5
Su Presencia | latin | 4
Hillsong en Español | latin | 4
Lilly Goodman | latin | 4
Funky | latin,hiphop | 4
Capital Kings | electronic | 3
LZ7 | electronic,hiphop | 3
`

export const artists = roster
  .trim()
  .split('\n')
  .map((line) => {
    const [name, genres, fame, flags = ''] = line.split('|').map((part) => part.trim())
    return { name, genres: genres.split(','), fame: Number(fame), mine: flags.includes('m'), instrumental: flags.includes('i') }
  })

for (const artist of artists) {
  for (const genre of artist.genres) if (!GENRES[genre]) throw new Error(`Unknown genre "${genre}" for ${artist.name}`)
}
