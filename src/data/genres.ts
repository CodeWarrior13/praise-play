export type GenreId =
  | 'contemporary-worship'
  | 'hymns'
  | 'gospel'
  | 'southern-gospel'
  | 'christian-rock'
  | 'christian-pop'
  | 'christian-hip-hop'
  | 'christian-r-and-b'
  | 'christian-country'
  | 'christian-metal'
  | 'christian-punk'
  | 'christian-electronic'
  | 'christian-folk'
  | 'christian-jazz'
  | 'christian-latin'
  | 'christian-indie'
  | 'children-and-family'
  | 'holiday'
  | 'other'

export type Genre = { id: GenreId; label: string; group: string }

/** A manageable starting taxonomy. Songs may have more than one genre tag. */
export const genres: Genre[] = [
  { id: 'contemporary-worship', label: 'Contemporary Worship', group: 'Worship & Gospel' },
  { id: 'hymns', label: 'Hymns', group: 'Worship & Gospel' },
  { id: 'gospel', label: 'Gospel', group: 'Worship & Gospel' },
  { id: 'southern-gospel', label: 'Southern Gospel', group: 'Worship & Gospel' },
  { id: 'christian-rock', label: 'Christian Rock', group: 'Rock & Alternative' },
  { id: 'christian-metal', label: 'Christian Metal', group: 'Rock & Alternative' },
  { id: 'christian-punk', label: 'Christian Punk', group: 'Rock & Alternative' },
  { id: 'christian-indie', label: 'Christian Indie / Alternative', group: 'Rock & Alternative' },
  { id: 'christian-pop', label: 'Christian Pop', group: 'Pop & Urban' },
  { id: 'christian-hip-hop', label: 'Christian Hip-Hop', group: 'Pop & Urban' },
  { id: 'christian-r-and-b', label: 'Christian R&B / Soul', group: 'Pop & Urban' },
  { id: 'christian-electronic', label: 'Christian Electronic', group: 'Pop & Urban' },
  { id: 'christian-country', label: 'Christian Country', group: 'Roots & Global' },
  { id: 'christian-folk', label: 'Christian Folk / Americana', group: 'Roots & Global' },
  { id: 'christian-jazz', label: 'Christian Jazz', group: 'Roots & Global' },
  { id: 'christian-latin', label: 'Christian Latin', group: 'Roots & Global' },
  { id: 'children-and-family', label: 'Children & Family', group: 'Other' },
  { id: 'holiday', label: 'Holiday', group: 'Other' },
  { id: 'other', label: 'Other / Cross-genre', group: 'Other' },
]
