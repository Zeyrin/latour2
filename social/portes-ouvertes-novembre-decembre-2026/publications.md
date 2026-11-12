# Portes ouvertes de novembre et décembre — Château Latour Ségur
Même direction artistique que la version « salle de réception & spa » d'octobre.
Horaires repris d'octobre : **de 11 h 30 à 14 h 30, ou sur rendez-vous**. À changer dans `render.mjs` (constante `hours`) s'ils sont différents.

| Édition | Dates | Dossier |
|---|---|---|
| Novembre | du vendredi 20 au vendredi 27 novembre 2026 | `novembre/` |
| Décembre | du lundi 14 au dimanche 20 décembre 2026 | `decembre/` |

Chaque dossier contient :
- `visuels/` : carrousel de 8 images (4:5) + 3 stories (9:16) ;
- `carrousel-….zip` : les 8 images du carrousel, dans l'ordre ;
- `carrousel-…-apercu.jpg` : les 8 images sur une planche ;
- `reel-portes-ouvertes-….mp4` : Reel/TikTok de 19 s, sans musique (à ajouter dans l'appli).

Pour régénérer :
```
NODE_PATH=$(npm root -g) node social/portes-ouvertes-novembre-decembre-2026/render.mjs
PO_DATES='Du 20 au<br><em>27 novembre</em>' PO_OUT=social/portes-ouvertes-novembre-decembre-2026/novembre/reel-portes-ouvertes-novembre.mp4 NODE_PATH=$(npm root -g) node social/portes-ouvertes-octobre-2026/video.mjs
```

Ordre du carrousel : 1. Couverture · 2. Les 3 facettes (Suites · Spa · Réceptions) · 3. Réunions & séminaires · 4. Team building · 5. Repas d'affaires · 6. Vos événements · 7. Le Spa TerreHappy® · 8. Contact

---

## NOVEMBRE — du 20 au 27 novembre

### Calendrier
| Date | Où | Contenu |
|---|---|---|
| Ven. 13 nov. | Feed Instagram | Carrousel (8 images) |
| Lun. 16 nov. | Story + Reel/TikTok | `story-1-save-the-date` + la vidéo |
| Mer. 18 nov. | Story | Repartage du carrousel + sticker compte à rebours |
| Ven. 20 nov. | Story | `story-2-c-est-parti` (premier jour) |
| Lun. 23 nov. | Feed + TikTok | Photo de couverture ou une vraie photo des visites + Reel |
| Mer. 25 nov. | Story | `story-3-derniers-jours` |
| Ven. 27 nov. | Story | Story 3 + « Dernier jour aujourd'hui ! » |

### Légende du carrousel
> Sous la voûte de pierre, au coin du feu… le château vous ouvre ses portes 🗝️
>
> Du 20 au 27 novembre, venez découvrir notre salle de réception voûtée et le Spa TerreHappy® pour vos **réunions, séminaires, team building, repas d'affaires et événements**.
>
> Entreprises ou particuliers, c'est le moment de visiter les lieux et de nous parler de votre projet : une journée de travail en équipe, un déjeuner client, une soirée entre amis ou une fête de famille.
>
> 🔥 Une salle voûtée en pierre avec sa grande cheminée
> 🌿 Un spa privatisable pour prolonger la journée
> 🍷 Au cœur du vignoble de Saint-Émilion
>
> 📅 Du vendredi 20 au vendredi 27 novembre
> 🕦 De 11 h 30 à 14 h 30, ou sur rendez-vous
> 📍 Lussac — Saint-Émilion
> 📞 05 57 51 06 72 · ✉️ contact@chateaulatoursegur.com
>
> Château Latour Ségur · Suites · Spa · Réceptions
>
> #chateaulatoursegur #portesouvertes #saintemilion #seminaire #teambuilding #salledereception #salledeseminaire #repasdaffaires #evenementprive #spa #terrehappy #chateau #bordeaux #gironde

### Légende du 2e post (lundi 23)
> Les visites ont commencé et le feu est allumé 🔥
>
> Jusqu'au vendredi 27 novembre, de 11 h 30 à 14 h 30 ou sur rendez-vous, entreprises et particuliers sont les bienvenus pour découvrir la salle voûtée, le spa et le domaine.
>
> Séminaire, déjeuner client, team building ou fête de famille : venez imaginer votre événement avec nous.
>
> 📞 05 57 51 06 72 · ✉️ contact@chateaulatoursegur.com
>
> Château Latour Ségur · Suites · Spa · Réceptions
>
> #chateaulatoursegur #portesouvertes #saintemilion #seminaire #teambuilding #evenement #chateau #gironde

### Légende du Reel / TikTok
> Et si votre prochaine réunion d'équipe avait lieu sous une voûte en pierre, au coin du feu ? 🏰 Portes ouvertes du 20 au 27 novembre, de 11 h 30 à 14 h 30 ou sur rendez-vous. #seminaire #teambuilding #chateau #saintemilion #portesouvertes #pov #bordeaux

---

## DÉCEMBRE — du 14 au 20 décembre

En décembre, on joue la carte des **fêtes de fin d'année** : repas de Noël d'entreprise, soirées, réceptions privées. L'image 6 du carrousel le mentionne.

### Calendrier
| Date | Où | Contenu |
|---|---|---|
| Lun. 7 déc. | Feed Instagram | Carrousel (8 images) |
| Mer. 9 déc. | Story + Reel/TikTok | `story-1-save-the-date` + la vidéo |
| Ven. 11 déc. | Story | Repartage du carrousel + sticker compte à rebours |
| Lun. 14 déc. | Story | `story-2-c-est-parti` (premier jour) |
| Mer. 16 déc. | Feed + TikTok | Photo de couverture ou une vraie photo des visites + Reel |
| Ven. 18 déc. | Story | `story-3-derniers-jours` |
| Dim. 20 déc. | Story | Story 3 + « Dernier jour aujourd'hui ! » |

### Légende du carrousel
> Un feu de cheminée, une voûte de pierre, une table de fête… le château vous ouvre ses portes avant les fêtes ✨
>
> Du 14 au 20 décembre, venez découvrir notre salle de réception voûtée et le Spa TerreHappy® pour vos **repas de fin d'année, séminaires, team building, repas d'affaires et événements**.
>
> Entreprises ou particuliers, c'est le moment de visiter les lieux et de préparer vos prochains rendez-vous : un repas d'équipe pour les fêtes, un séminaire de rentrée, une soirée en famille.
>
> 🔥 Une salle voûtée en pierre avec sa grande cheminée
> 🌿 Un spa privatisable, pour soi ou à offrir
> 🍷 Au cœur du vignoble de Saint-Émilion
>
> 📅 Du lundi 14 au dimanche 20 décembre
> 🕦 De 11 h 30 à 14 h 30, ou sur rendez-vous
> 📍 Lussac — Saint-Émilion
> 📞 05 57 51 06 72 · ✉️ contact@chateaulatoursegur.com
>
> Château Latour Ségur · Suites · Spa · Réceptions
>
> #chateaulatoursegur #portesouvertes #saintemilion #repasdenoel #repasdefindannee #seminaire #teambuilding #salledereception #evenementprive #spa #terrehappy #chateau #bordeaux #gironde

### Légende du 2e post (mercredi 16)
> Le feu crépite, la salle est prête pour les fêtes 🎄
>
> Jusqu'au dimanche 20 décembre, de 11 h 30 à 14 h 30 ou sur rendez-vous, venez visiter le château et imaginer votre repas de fin d'année, votre séminaire ou votre réception.
>
> 📞 05 57 51 06 72 · ✉️ contact@chateaulatoursegur.com
>
> Château Latour Ségur · Suites · Spa · Réceptions
>
> #chateaulatoursegur #portesouvertes #saintemilion #repasdenoel #seminaire #evenement #chateau #gironde

### Légende du Reel / TikTok
> Votre repas de fin d'année sous une voûte en pierre, au coin du feu ? 🔥 Portes ouvertes du 14 au 20 décembre, de 11 h 30 à 14 h 30 ou sur rendez-vous. #repasdenoel #seminaire #chateau #saintemilion #portesouvertes #pov #bordeaux
