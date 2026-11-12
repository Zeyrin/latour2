// Revue mobile : `npm run build && npx vite preview` puis `node scripts/mobile-audit.mjs <dossier-captures>`.
// Signale débordements, textes < 12 px, zones tactiles < 44 px, chevauchements et erreurs axe (WCAG AA).
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
const OUT = process.argv[2]; const BASE = process.argv[3] || 'http://localhost:4173'
const pages = (process.env.PAGES || '/,/en,/suites/terre,/suites/metal,/suites/eau,/reservation/confirmation,/reservation/annulation,/mentions-legales,/confidentialite').split(',')
const widths = (process.env.WIDTHS || '360,390,430').split(',').map(Number)
const shots = process.env.SHOTS !== '0'
const browser = await chromium.launch()
const report = {}
for (const w of widths) for (const p of pages) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE + p, { waitUntil: 'load' })
  await page.addStyleTag({ content: '*{animation-duration:0s!important;transition:none!important}' })
  await page.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager') })
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } window.scrollTo(0, 0) })
  await page.waitForTimeout(800)
  await page.evaluate(() => document.querySelectorAll('[style*="opacity"]').forEach(e => { e.style.opacity = '1'; e.style.transform = 'none' }))
  const issues = await page.evaluate((vw) => {
    const out = { hscroll: document.documentElement.scrollWidth - vw, overflowing: [], tiny: [], smallText: [], clipped: [], overlaps: [] }
    const desc = (e) => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '')).slice(0, 80) + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40).replace(/\n/g, ' ') + '"'
    const visible = (e) => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const inScroller = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && a !== document.body && a !== document.documentElement) return true } return false }
    for (const e of document.querySelectorAll('body *')) {
      if (!visible(e)) continue
      const r = e.getBoundingClientRect()
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(e) && getComputedStyle(e).position !== 'fixed') out.overflowing.push(desc(e) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`)
      if (e.matches('a,button,input,select,textarea,summary,[role=button],label[for]') && !e.closest('[aria-hidden=true]')) {
        if (r.height < 44 || r.width < 44) out.tiny.push(desc(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      const s = getComputedStyle(e)
      const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      if (hasText && parseFloat(s.fontSize) < 12) out.smallText.push(desc(e) + ' ' + s.fontSize)
      if (hasText && (e.scrollWidth > e.clientWidth + 1) && /(hidden|clip)/.test(s.overflowX) ) out.clipped.push(desc(e))
    }
    // overlap between text-bearing leaf blocks
    const leaves = [...document.querySelectorAll('h1,h2,h3,p,a,button,span,li,label,dt,dd')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('[aria-hidden=true],.preloader'))
    const rects = leaves.map(e => [e, e.getBoundingClientRect()])
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i], [b, rb] = rects[j]
      if (a.contains(b) || b.contains(a)) continue
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (ox > 4 && oy > 4) out.overlaps.push(desc(a) + ' ⟷ ' + desc(b))
    }
    return out
  }, w)
  if (shots) await page.screenshot({ path: `${OUT}/${w}${p.replace(/\//g, '_') || '_home'}.png`, fullPage: true })
  let axe = []
  if (w === 390) { const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); axe = r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')) })) }
  report[`${w}${p}`] = { ...issues, axe }
  await ctx.close()
}
await browser.close()
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1))
console.log('done')
