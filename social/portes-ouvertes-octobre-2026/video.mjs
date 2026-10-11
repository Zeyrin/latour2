// Monte un Reel / TikTok vertical (1080×1920, ~20 s, sans musique) à partir des photos.
// Usage : NODE_PATH=$(npm root -g) node social/portes-ouvertes-octobre-2026/video.mjs
// Prérequis : ffmpeg dans le PATH.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { chromium } = createRequire(import.meta.url)('playwright')
const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '../../public')
const tmp = mkdtempSync(join(tmpdir(), 'po-video-'))
const outDir = join(here, 'videos')
mkdirSync(outDir, { recursive: true })

const FPS = 30
const FADE = 0.4
const asset = (p) => pathToFileURL(join(pub, p)).href

// focus : position horizontale du sujet (0 = gauche, 1 = droite) ; pan : sens du travelling
const scenes = [
  { photo: 'salle-voutee-cheminee-verticale', focus: 0.5, pan: 'up', dur: 3.2, kicker: 'POV', text: 'Votre prochain séminaire<br><em>se passe ici</em>' },
  { photo: 'seminaire-conference', focus: 0.52, pan: 'right', dur: 2.8, noBrand: true, kicker: '01', text: 'Réunions<br><em>&amp; séminaires</em>' },
  { photo: 'salle-voutee-reception', focus: 0.45, pan: 'left', dur: 2.8, kicker: '02', text: 'Team<br><em>building</em>' },
  { photo: 'salle-cheminee-table', focus: 0.4, pan: 'right', dur: 2.8, kicker: '03', text: 'Repas d’affaires<br><em>au coin du feu</em>' },
  { photo: 'soiree-musiciens', focus: 0.45, pan: 'left', dur: 2.8, kicker: '04', text: 'Soirées<br><em>&amp; événements</em>' },
  { photo: 'spa-couloir-piscine', focus: 0.5, pan: 'up', dur: 2.8, kicker: '05', text: 'Et un spa<br><em>pour prolonger</em>' },
  { photo: 'porte-ouverte-couloir', focus: 0.47, pan: 'zoom', dur: 4.2, kicker: 'Portes ouvertes', text: 'Du 14 au<br><em>21 octobre</em>', end: true },
]

const css = `
@font-face{font-family:Newsreader;src:url('${asset('fonts/newsreader.woff2')}') format('woff2');font-weight:300 500}
@font-face{font-family:Newsreader;src:url('${asset('fonts/newsreader-italic.woff2')}') format('woff2');font-style:italic;font-weight:300 500}
@font-face{font-family:Roboto;src:url('${asset('fonts/roboto.woff2')}') format('woff2');font-weight:400 500}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:Newsreader,serif;color:#f8f6f2;-webkit-font-smoothing:antialiased}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(32,10,5,.45) 0%,rgba(32,10,5,0) 22%,rgba(32,10,5,0) 42%,rgba(32,10,5,.78) 72%,rgba(32,10,5,.9) 100%)}
.brand{position:absolute;top:200px;left:0;right:0;text-align:center;line-height:1;text-shadow:0 2px 16px rgba(0,0,0,.4)}
.brand small{display:block;font-family:Roboto;font-size:20px;letter-spacing:.42em;text-transform:uppercase;margin-bottom:10px}
.brand b{font-weight:300;font-size:52px;letter-spacing:.04em}
.txt{position:absolute;left:80px;right:150px;bottom:470px;text-align:left;text-shadow:0 3px 22px rgba(0,0,0,.45)}
.k{font-family:Roboto;font-size:24px;letter-spacing:.38em;text-transform:uppercase;color:#e9d6b5;margin-bottom:26px}
h1{font-weight:300;font-size:112px;line-height:1}
h1 em{font-style:italic}
.end{position:absolute;left:80px;right:150px;bottom:330px;font-family:Roboto;font-size:28px;line-height:1.7;letter-spacing:.04em}
.end .tags{color:#e9d6b5;font-size:22px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:18px}
`
const overlay = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="shade"></div>
${s.noBrand ? '' : '<div class="brand"><small>Château</small><b>Latour Ségur</b></div>'}
<div class="txt" ${s.end ? 'style="bottom:560px"' : ''}><div class="k">${s.kicker}</div><h1>${s.text}</h1></div>
${s.end ? '<div class="end"><div class="tags">Entreprises &amp; particuliers</div>05 57 51 06 72<br>contact@chateaulatoursegur.com</div>' : ''}
</body></html>`

// 1. Calques de texte transparents
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [i, s] of scenes.entries()) {
  const f = join(tmp, `o${i}.html`)
  writeFileSync(f, overlay(s))
  await page.goto(pathToFileURL(f).href)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(tmp, `o${i}.png`), omitBackground: true })
}
await browser.close()

// 2. Un clip par scène : travelling lent sur la photo + texte qui apparaît en fondu
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
for (const [i, s] of scenes.entries()) {
  const D = s.dur
  const W = 1188, H = 2112 // ~10 % de marge pour le mouvement
  let move
  if (s.pan === 'zoom') {
    move = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},zoompan=z='1+0.0012*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=${FPS}`
  } else if (s.pan === 'up') {
    move = `scale=1080:2160:force_original_aspect_ratio=increase,crop=1080:2160,crop=1080:1920:0:'(in_h-out_h)*(1-t/${D})'`
  } else {
    // photo paysage : on se cale sur le sujet puis on glisse de ~120 px
    const span = 120
    const x0 = `max(0,min(in_w-out_w,in_w*${s.focus}-out_w/2-${span / 2}))`
    const x = s.pan === 'right' ? `${x0}+${span}*t/${D}` : `${x0}+${span}*(1-t/${D})`
    move = `scale=-2:${H},crop=1080:1920:'${x}':'(in_h-out_h)/2'`
  }
  ff([
    '-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', join(here, 'photos', `${s.photo}.jpg`),
    '-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', join(tmp, `o${i}.png`),
    '-filter_complex',
    `[0]${move},setsar=1,fps=${FPS},format=yuv420p[bg];` +
    `[1]format=rgba,fade=in:st=0.25:d=0.5:alpha=1[ov];[bg][ov]overlay=0:0:format=auto,format=yuv420p`,
    '-t', String(D), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    join(tmp, `c${i}.mp4`),
  ])
  console.log('✓ scène', i + 1, s.photo)
}

// 3. Assemblage avec fondus enchaînés
const inputs = scenes.flatMap((_, i) => ['-i', join(tmp, `c${i}.mp4`)])
let chain = '', prev = '[0:v]', offset = 0
for (let i = 1; i < scenes.length; i++) {
  offset += scenes[i - 1].dur - FADE
  const lab = i === scenes.length - 1 ? '[v]' : `[x${i}]`
  chain += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}${lab};`
  prev = lab
}
const out = join(outDir, 'reel-portes-ouvertes-salle-spa.mp4')
ff([...inputs, '-filter_complex', chain.slice(0, -1), '-map', '[v]', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
console.log('→', out)
