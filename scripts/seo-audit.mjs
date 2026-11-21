// Contrôle SEO du HTML pré-rendu (dist/) : node scripts/seo-audit.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = 'dist'
const files = []
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) { if (!['assets', 'images', 'fonts', 'static-loader-data'].includes(f)) walk(p) } else if (p.endsWith('.html') && !f.startsWith('google')) files.push(p) } }
walk(root)

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const attr = (html, re) => decode(html.match(re)?.[1] ?? '')
let problems = 0
const warn = (page, msg) => { problems++; console.log(`  ⚠ ${page}: ${msg}`) }

const titles = new Map()
for (const file of files.sort()) {
  const html = readFileSync(file, 'utf8')
  const page = '/' + relative(root, file).replace(/index\.html$/, '').replace(/\.html$/, '')
  const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? '')
  const desc = attr(html, /<meta[^>]*name="description" content="([^"]*)"/)
  const robots = attr(html, /<meta[^>]*name="robots" content="([^"]*)"/) || 'index'
  const canonical = attr(html, /<link[^>]*rel="canonical" href="([^"]*)"/)
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => decode(m[1].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
  const lang = attr(html, /<html[^>]*lang="([^"]*)"/)
  const types = []
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1])
      const nodes = data['@graph'] ?? [data]
      for (const n of nodes) types.push([].concat(n['@type']).join('+'))
    } catch (e) { warn(page, `JSON-LD invalide (${e.message})`) }
  }
  console.log(`${page}\n  title (${title.length}) ${title}\n  description ${desc.length} · robots ${robots} · lang ${lang}\n  canonical ${canonical}\n  H1 ×${h1s.length}: ${h1s.join(' | ')}\n  JSON-LD: ${types.join(', ') || '—'}`)
  if (title.length > 60) warn(page, `title > 60 (${title.length})`)
  if (!desc) warn(page, 'description absente'); else if (desc.length > 155) warn(page, `description > 155 (${desc.length})`)
  if (h1s.length !== 1) warn(page, `${h1s.length} H1`)
  if (!lang) warn(page, 'html lang absent')
  if (!robots.includes('noindex')) {
    if (!canonical) warn(page, 'canonical absent')
    if (titles.has(title)) warn(page, `title identique à ${titles.get(title)}`)
    titles.set(title, page)
  }
  if (!/og:image/.test(html)) warn(page, 'og:image absent')
}
console.log(problems ? `\n${problems} problème(s)` : '\nAucun problème.')
process.exitCode = problems ? 1 : 0
