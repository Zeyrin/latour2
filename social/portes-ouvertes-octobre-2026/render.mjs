// Génère les visuels Instagram / TikTok des portes ouvertes (14 → 21 octobre).
// Usage : NODE_PATH=$(npm root -g) node social/portes-ouvertes-octobre-2026/render.mjs
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { chromium } = createRequire(import.meta.url)('playwright')
const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '../../public')
const out = join(here, 'visuels')
const tmp = mkdtempSync(join(tmpdir(), 'po-'))
mkdirSync(out, { recursive: true })

const asset = (p) => pathToFileURL(join(pub, p)).href
const img = (name) => name.startsWith('photos/') ? pathToFileURL(join(here, `${name}.jpg`)).href : asset(`images/${name}.webp`)

const sketch = `<svg class="sketch" viewBox="0 0 110 68" fill="none" stroke="currentColor" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round"><path d="M7 61h96M12 58h86M17 56V28h76v28M14 28h82M15 25h80M22 23V15h22M66 15h22v8M19 15h28M63 15h28M38 23 55 9l17 14H38ZM44 24h22M46 56V30h18v26M43 57h24M41 60h28"/><path d="M26 34h8v11h-8zM76 34h8v11h-8zM26 49h8v7h-8zM76 49h8v7h-8zM51 36a4 4 0 0 1 8 0v9h-8zM51 56V49h8v7M30 34v11m-4-6h8M80 34v11m-4-6h8M55 36v9m-4-5h8M23 15v-5m-2 0h4m62 5v-5m-2 0h4M55 9V4m-2 0h4"/><path d="M4 56c-6-11 2-19 6-15-2-10 5-16 9-12M3 61l4-14M99 61l3-15m-5 11c-6-8-2-16 3-15-2-10 6-16 9-8 3 5-1 9-4 11 6 3 3 10-6 12"/><circle cx="55" cy="19" r="2.3"/></svg>`

const brand = (cls = '') => `<div class="brand ${cls}"><span class="b-small">Château</span><span class="b-name">Latour Ségur</span><span class="b-facets">Suites · Spa · Réceptions</span><span class="b-loc">Saint-Émilion · France</span></div>`

const css = `
@font-face{font-family:Newsreader;src:url('${asset('fonts/newsreader.woff2')}') format('woff2');font-style:normal;font-weight:300 500}
@font-face{font-family:Newsreader;src:url('${asset('fonts/newsreader-italic.woff2')}') format('woff2');font-style:italic;font-weight:300 500}
@font-face{font-family:Roboto;src:url('${asset('fonts/roboto.woff2')}') format('woff2');font-weight:400 500}
:root{--wine:#44190e;--cream:#f8f6f2;--sand:#f0eeec;--gold:#b89b72;--stone:#6c6c6b}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:var(--w);height:var(--h);overflow:hidden;background:var(--cream)}
body{font-family:Newsreader,Georgia,serif;color:var(--wine);-webkit-font-smoothing:antialiased}
.frame{position:relative;width:100%;height:100%;overflow:hidden}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(32,10,5,.6) 0%,rgba(32,10,5,.1) 28%,rgba(32,10,5,.45) 48%,rgba(32,10,5,.9) 100%)}
.border{position:absolute;inset:34px;border:1.5px solid rgba(184,155,114,.85);pointer-events:none}
.light .border{border-color:rgba(68,25,14,.25)}
.content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:96px 90px}
.on-photo{color:var(--cream)}
.brand{display:flex;flex-direction:column;align-items:center;line-height:1}
.b-small{font-family:Roboto,sans-serif;font-size:19px;letter-spacing:.42em;text-transform:uppercase;margin-bottom:10px}
.b-name{font-size:50px;font-weight:300;letter-spacing:.04em}
.b-facets{font-style:italic;font-size:27px;font-weight:300;letter-spacing:.03em;margin-top:14px}
.b-loc{font-family:Roboto,sans-serif;font-size:14px;letter-spacing:.32em;text-transform:uppercase;margin-top:12px;opacity:.75}
.facets{font-family:Roboto,sans-serif;font-size:20px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);margin-top:26px}
.facets-name{font-size:40px;font-weight:300;margin-top:22px;letter-spacing:.03em}
.kicker{font-family:Roboto,sans-serif;font-size:22px;letter-spacing:.38em;text-transform:uppercase;color:var(--gold)}
.on-photo .kicker{color:#f1e3c9}
.on-photo{text-shadow:0 2px 18px rgba(20,6,3,.35)}
h1{font-weight:300;font-size:132px;line-height:.95;letter-spacing:-.01em}
h1 em,h2 em{font-style:italic}
h2{font-weight:300;font-size:92px;line-height:1.02}
.rule{width:90px;height:1.5px;background:var(--gold);margin:34px auto}
.dates{display:flex;align-items:center;gap:30px;font-weight:300}
.dates .d{font-size:150px;line-height:.9}
.dates .m{font-family:Roboto,sans-serif;font-size:22px;letter-spacing:.3em;text-transform:uppercase;text-align:left;line-height:1.5}
.dates .arrow{font-size:70px;font-style:italic;opacity:.8}
.lead{font-size:38px;line-height:1.3;font-weight:300;max-width:860px}
.lead em{font-style:italic}
.tags{font-family:Roboto,sans-serif;font-size:21px;letter-spacing:.2em;text-transform:uppercase;line-height:2}
.num{font-size:30px;font-style:italic;color:var(--gold)}
.spacer{flex:1}
.sketch{width:220px;color:var(--gold)}
.split .photo{bottom:auto;height:58%}
.split .panel{position:absolute;left:0;right:0;bottom:0;height:42%;background:var(--cream);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 110px 70px}
.split .panel h2{font-size:80px}
.split .panel p{font-size:34px;line-height:1.32;font-weight:300;color:var(--stone);margin-top:22px}
.split .badge{position:absolute;top:70px;left:70px;background:var(--cream);color:var(--wine);font-family:Roboto,sans-serif;font-size:19px;letter-spacing:.3em;text-transform:uppercase;padding:16px 24px}
.wine{background:var(--wine);color:var(--cream)}
.wine .border{border-color:rgba(184,155,114,.6)}
.list{font-size:44px;font-weight:300;line-height:1.55}
.list span{color:var(--gold);font-style:italic}
.contact{font-family:Roboto,sans-serif;font-size:26px;letter-spacing:.06em;line-height:1.9}
.btn{display:inline-block;border:1.5px solid var(--gold);padding:24px 44px;font-family:Roboto,sans-serif;font-size:22px;letter-spacing:.3em;text-transform:uppercase}
.sticker{display:inline-block;background:var(--cream);color:var(--wine);font-family:Roboto,sans-serif;font-size:24px;letter-spacing:.28em;text-transform:uppercase;padding:18px 30px}
`

const page = (w, h, body, cls = '') => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${css}</style></head><body><div class="frame ${cls}">${body}</div></body></html>`

const datesBlock = `<div class="dates"><span class="d">14</span><span class="arrow">→</span><span class="d">21</span><span class="m">octobre<br>2026</span></div>`

const split = (n, image, pos, badge, title, text) => page(1080, 1350, `
  <div class="photo" style="background-image:url('${img(image)}');background-position:${pos}"></div>
  <div class="badge">Portes ouvertes · 14 → 21 oct.</div>
  <div class="panel"><div class="num">${n}</div><h2>${title}</h2><p>${text}</p></div>
  <div class="border"></div>`, 'split')

const visuals = {
  // ——— Carrousel Instagram 4:5 ———
  'carrousel-1-couverture': page(1080, 1350, `
    <div class="photo" style="background-image:url('${img('domaine')}');background-position:38% center"></div><div class="shade"></div>
    <div class="content on-photo">${brand()}<div class="spacer"></div>
      <div class="kicker">Entreprises & particuliers</div><div class="rule"></div>
      <h1>Portes<br><em>ouvertes</em></h1><div class="rule"></div>${datesBlock}
    </div><div class="border"></div>`),
  'carrousel-2-seminaires': split('01', 'chateau-panorama', '78% center', '', 'Réunions <em>&</em><br>séminaires', 'Sortir du bureau pour penser autrement, entre vieilles pierres et parc arboré.'),
  'carrousel-3-team-building': split('02', 'parc', 'center 60%', '', 'Team <em>building</em>', 'Des allées de cyprès, de grands espaces verts : l’équipe se retrouve vraiment.'),
  'carrousel-4-repas-affaires': split('03', 'evenements', 'center center', '', 'Repas <em>d’affaires</em>', 'Une belle table dans une demeure de caractère, pour des échanges qui comptent.'),
  'carrousel-5-evenements': split('04', 'art-de-vivre', 'center center', '', 'Vos <em>événements</em>', 'Anniversaire, fête de famille, réception privée : un cadre unique pour célébrer.'),
  'carrousel-6-contact': page(1080, 1350, `
    <div class="content">${sketch}<div class="facets-name">Château Latour Ségur</div><div class="facets">Suites · Spa · Réceptions</div><div class="rule"></div>
      <h2>Venez <em>visiter</em><br>le château</h2><div class="rule"></div>
      <p class="lead">Du mercredi 14 au mercredi 21 octobre, découvrez les espaces et imaginons ensemble votre <em>projet</em>.</p>
      <div class="spacer"></div>
      <div class="list" style="font-size:40px">Réunions <span>·</span> Séminaires<br>Team building <span>·</span> Repas d’affaires<br>Événements privés</div>
      <div class="spacer"></div>
      <div class="btn">Contactez-nous</div><div style="height:40px"></div>
      <div class="contact">05 57 51 06 72<br>contact@chateaulatoursegur.com<br>Lussac — Saint-Émilion</div>
    </div><div class="border"></div>`, 'wine'),

  // ——— Stories / Reels / TikTok 9:16 ———
  'story-1-save-the-date': page(1080, 1920, `
    <div class="photo" style="background-image:url('${img('domaine-mobile')}')"></div><div class="shade"></div>
    <div class="content on-photo" style="padding:250px 90px 330px">${brand()}<div class="spacer"></div>
      <div class="sticker">Save the date</div><div style="height:50px"></div>
      <h1>Portes<br><em>ouvertes</em></h1><div class="rule"></div>${datesBlock}<div class="rule"></div>
      <div class="tags">Réunions · Séminaires · Team building<br>Repas d’affaires · Événements</div>
    </div><div class="border"></div>`),
  'story-2-c-est-parti': page(1080, 1920, `
    <div class="photo" style="background-image:url('${img('parc')}')"></div><div class="shade"></div>
    <div class="content on-photo" style="padding:250px 90px 330px">${brand()}<div class="spacer"></div>
      <div class="kicker">Mercredi 14 octobre</div><div class="rule"></div>
      <h1>C’est <em>parti&nbsp;!</em></h1><div class="rule"></div>
      <p class="lead">Les portes du château sont ouvertes jusqu’au <em>21 octobre</em>. Venez découvrir nos espaces pour vos séminaires et événements.</p>
    </div><div class="border"></div>`),
  'story-3-derniers-jours': page(1080, 1920, `
    <div class="content" style="padding:250px 90px 330px">${sketch}<div class="facets-name">Château Latour Ségur</div><div class="facets">Suites · Spa · Réceptions</div><div class="rule"></div>
      <div class="kicker">Portes ouvertes</div><div style="height:40px"></div>
      <h1>Derniers<br><em>jours</em></h1><div class="rule"></div>
      <p class="lead">Jusqu’au mercredi <em>21 octobre</em> pour visiter le château et préparer votre prochain événement.</p>
      <div class="spacer"></div>
      <div class="list">Réunions <span>·</span> Séminaires<br>Team building <span>·</span> Repas d’affaires<br>Événements privés</div>
      <div class="spacer"></div>
      <div class="contact">05 57 51 06 72<br>contact@chateaulatoursegur.com</div>
    </div><div class="border"></div>`, 'wine'),
  // ——— Version « salle de réception & spa » (photos de la salle voûtée et du Spa TerreHappy®) ———
  'salle-spa/carrousel-1-couverture': page(1080, 1350, `
    <div class="photo" style="background-image:url('${img('photos/salle-voutee-cheminee-verticale')}');background-position:center 70%;filter:brightness(1.25)"></div><div class="shade"></div>
    <div class="content on-photo">${brand()}<div class="spacer"></div>
      <div class="kicker">Entreprises & particuliers</div><div class="rule"></div>
      <h1>Portes<br><em>ouvertes</em></h1><div class="rule"></div>${datesBlock}
    </div><div class="border"></div>`),
  'salle-spa/carrousel-2-seminaires': split('01', 'photos/seminaire-conference', 'center 30%', '', 'Réunions <em>&</em><br>séminaires', 'Sous la voûte de pierre, un lieu qui donne envie d’écouter, d’échanger et d’avancer ensemble.'),
  'salle-spa/carrousel-3-team-building': split('02', 'photos/salle-voutee-reception', 'center 55%', '', 'Team <em>building</em>', 'Une grande salle voûtée et un parc pour sortir du quotidien et resserrer les liens.'),
  'salle-spa/carrousel-4-repas-affaires': split('03', 'photos/salle-cheminee-table', 'center center', '', 'Repas <em>d’affaires</em>', 'Une table au coin du feu, dans une salle de caractère, pour des échanges qui comptent.'),
  'salle-spa/carrousel-5-evenements': split('04', 'photos/soiree-musiciens', 'center 35%', '', 'Vos <em>événements</em>', 'Soirées, anniversaires, réceptions privées : la salle se prête à toutes les célébrations.'),
  'salle-spa/carrousel-6-spa': split('05', 'photos/spa-couloir-piscine', 'center 62%', '', 'Le Spa <em>TerreHappy®</em>', 'Un espace bien-être privatisable pour prolonger la journée en toute sérénité.'),
  'salle-spa/carrousel-7-contact': page(1080, 1350, `
    <div class="content">${sketch}<div class="facets-name">Château Latour Ségur</div><div class="facets">Suites · Spa · Réceptions</div><div class="rule"></div>
      <h2>Venez <em>visiter</em><br>le château</h2><div class="rule"></div>
      <p class="lead">Du mercredi 14 au mercredi 21 octobre, découvrez la salle de réception, le spa et le domaine, et imaginons ensemble votre <em>projet</em>.</p>
      <div class="spacer"></div>
      <div class="list" style="font-size:40px">Réunions <span>·</span> Séminaires<br>Team building <span>·</span> Repas d’affaires<br>Événements privés</div>
      <div class="spacer"></div>
      <div class="btn">Contactez-nous</div><div style="height:40px"></div>
      <div class="contact">05 57 51 06 72<br>contact@chateaulatoursegur.com<br>Lussac — Saint-Émilion</div>
    </div><div class="border"></div>`, 'wine'),
  'salle-spa/story-1-save-the-date': page(1080, 1920, `
    <div class="photo" style="background-image:url('${img('photos/salle-voutee-cheminee-verticale')}');filter:brightness(1.2)"></div><div class="shade"></div>
    <div class="content on-photo" style="padding:250px 90px 330px">${brand()}<div class="spacer"></div>
      <div class="sticker">Save the date</div><div style="height:50px"></div>
      <h1>Portes<br><em>ouvertes</em></h1><div class="rule"></div>${datesBlock}<div class="rule"></div>
      <div class="tags">Réunions · Séminaires · Team building<br>Repas d’affaires · Événements</div>
    </div><div class="border"></div>`),
  'salle-spa/story-2-c-est-parti': page(1080, 1920, `
    <div class="photo" style="background-image:url('${img('photos/porte-ouverte-couloir')}');background-position:47% center"></div><div class="shade"></div>
    <div class="content on-photo" style="padding:250px 90px 330px">${brand()}<div class="spacer"></div>
      <div class="kicker">Mercredi 14 octobre</div><div class="rule"></div>
      <h1>Les portes<br>sont <em>ouvertes</em></h1><div class="rule"></div>
      <p class="lead">Jusqu’au <em>21 octobre</em>, venez découvrir la salle de réception et le spa pour vos séminaires et événements.</p>
    </div><div class="border"></div>`),
  'salle-spa/story-3-derniers-jours': page(1080, 1920, `
    <div class="photo" style="background-image:url('${img('photos/spa-couloir-piscine')}')"></div><div class="shade"></div>
    <div class="content on-photo" style="padding:250px 90px 330px">${brand()}<div class="spacer"></div>
      <div class="sticker">Derniers jours</div><div style="height:50px"></div>
      <h1>Jusqu’au<br><em>21 octobre</em></h1><div class="rule"></div>
      <p class="lead">Dernière ligne droite pour visiter le château et préparer votre prochain événement.</p><div class="rule"></div>
      <div class="contact">05 57 51 06 72<br>contact@chateaulatoursegur.com</div>
    </div><div class="border"></div>`),
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
for (const [name, html] of Object.entries(visuals)) {
  const [w, h] = name.includes('story') ? [1080, 1920] : [1080, 1350]
  const file = join(tmp, `${name.replace('/', '--')}.html`)
  const target = name.includes('/') ? join(here, `visuels-${name}.png`) : join(out, `${name}.png`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(file, html)
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.goto(pathToFileURL(file).href)
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: target })
  await p.close()
  console.log('✓', name)
}
await browser.close()
