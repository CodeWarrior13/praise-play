/**
 * GET /api/card?r=<shared run>&size=link|story → the results card as a JPEG.
 * GET /api/card?i=<invite>&size=link|story → the invite card ("come play with me").
 * `link` (1200×630) is what iMessage, WhatsApp, email, Facebook, X… show under a
 * shared link; `story` (1080×1920) is for Instagram/TikTok/Facebook stories.
 */
import { readSharedRun } from '../../src/lib/shareRun'
import { readInvite } from '../../src/lib/invite'
import { renderCard, renderInvite, type CardSize } from '../lib/card'

export default async (request: Request) => {
  const url = new URL(request.url)
  const shared = readSharedRun(url.searchParams.get('r'))
  const invite = shared ? null : readInvite(url.searchParams.get('i'))
  if (!shared && !invite) return new Response('Bad card', { status: 400 })
  const size: CardSize = url.searchParams.get('size') === 'story' ? 'story' : 'link'
  try {
    const png = shared ? await renderCard(url.origin, shared, size) : await renderInvite(url.origin, invite!, size)
    return new Response(png, {
      headers: {
        'content-type': 'image/jpeg',
        // The image only depends on the URL, so it can be cached for good.
        'cache-control': 'public, max-age=31536000, immutable',
        'netlify-cdn-cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new Response(`Card failed: ${(error as Error).message}`, { status: 500 })
  }
}

export const config = { path: '/api/card' }
