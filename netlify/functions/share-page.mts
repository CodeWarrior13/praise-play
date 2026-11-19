/**
 * GET /s?r=<shared run> → a tiny page whose link-preview tags (Open Graph and
 * Twitter) carry the results-card image, so a shared link shows the card in
 * messages, email and social apps. People are sent straight on to the game.
 */
import { readSharedRun, shareMessage } from '../../src/lib/shareRun'

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export default async (request: Request) => {
  const url = new URL(request.url)
  const r = url.searchParams.get('r') ?? ''
  const shared = readSharedRun(r)
  const target = shared ? `${url.origin}/?r=${encodeURIComponent(r)}` : `${url.origin}/`
  const title = shared ? shareMessage(shared.total, shared.name) : 'Praise Play'
  const named = shared ? shared.results.filter((x) => x.outcome === 'named').length : 0
  const description = shared
    ? `Named ${named} of ${shared.results.length} Christian songs from as little as 0.1 seconds. Tap to see the songs and take them on.`
    : 'Name the Christian song from 0.1 seconds.'
  const image = shared ? `${url.origin}/api/card?r=${encodeURIComponent(r)}` : `${url.origin}/icons/sanctuary-512.png`
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Praise Play">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url.href)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:secure_url" content="${escape(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<meta http-equiv="refresh" content="0; url=${escape(target)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0820;color:#fff;font-family:system-ui,sans-serif}a{color:#ffb4d8}</style>
</head><body>
<p><a href="${escape(target)}">Open Praise Play →</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}

export const config = { path: '/s' }
