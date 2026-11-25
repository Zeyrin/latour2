import type { SuiteId } from './content'
import type { Lang } from './i18n'

/**
 * Les guides (rubrique /guides) : des articles utiles aux voyageurs qui préparent un séjour autour de Saint-Émilion,
 * chacun relié aux suites et à la réservation en direct.
 *
 * Écriture d'un paragraphe : texte simple, avec des liens au format [texte](adresse).
 * Adresses possibles : un chemin du site (« /suites/terre », « guide:romantique » pour un autre guide),
 * « spa » (site du spa, avec suivi), « cadeau » (boutique des bons cadeaux) ou une adresse https complète.
 *
 * Pour ajouter un guide : copier un bloc de `guides`, changer l'identifiant, les adresses (slug) et la date,
 * puis l'ajouter au plan du site (public/sitemap.xml).
 */

export type GuideId = 'week-end-saint-emilion' | 'romantique' | 'dormir-chateau'

export type GuideBlock =
  /** Paragraphe. */
  | string
  /** Intertitre. */
  | { h2: string }
  /** Liste à puces. */
  | { list: string[] }
  /** Carte d'une suite, avec réservation directe de cette suite. */
  | { suite: SuiteId; text: string }

export interface GuideText {
  /** Adresse de la page, après /guides/ (ou /en/guides/). */
  slug: string
  /** Petit libellé au-dessus du titre et sur les cartes. */
  category: string
  title: string
  /** Titre pour Google (avant « | Latour Ségur »), 46 caractères au plus. */
  seoTitle: string
  /** Description pour Google, 155 caractères au plus. */
  description: string
  /** Chapeau, sous le titre. */
  lead: string
  imageAlt: string
  body: GuideBlock[]
}

export interface Guide {
  id: GuideId
  /** Image de public/images (sans extension). */
  image: string
  /** Suite mise en avant dans le bouton « Réserver » de la page. */
  suite: SuiteId
  published: string
  updated: string
  related: GuideId[]
  text: Record<Lang, GuideText>
}

export const guides: Guide[] = [
  {
    id: 'week-end-saint-emilion',
    image: 'domaine-vignes-aube',
    suite: 'terre',
    published: '2026-11-24',
    updated: '2026-11-24',
    related: ['romantique', 'dormir-chateau'],
    text: {
      fr: {
        slug: 'week-end-saint-emilion-que-faire',
        category: 'Itinéraire',
        title: 'Que faire à Saint-Émilion en un week-end : notre itinéraire de deux jours',
        seoTitle: 'Que faire à Saint-Émilion en un week-end',
        description: 'Église monolithe, Tour du Roy, visite d’un grand cru, appellations voisines et spa : l’itinéraire de deux jours que nous conseillons à nos hôtes.',
        lead: 'Deux jours suffisent pour sentir l’âme de Saint-Émilion : un village de pierre blonde perché au-dessus des vignes, une église creusée dans la roche et, tout autour, des centaines de châteaux. Voici l’itinéraire que nous conseillons à nos hôtes, pensé pour profiter sans courir.',
        imageAlt: 'Les vignes du domaine au lever du jour, près de Saint-Émilion',
        body: [
          { h2: 'Avant de partir : trois conseils' },
          { list: [
            'Réservez vos visites de châteaux à l’avance. La plupart des propriétés ne reçoivent que sur rendez-vous, surtout le week-end et hors saison.',
            'Prévoyez de bonnes chaussures. Les ruelles du village, qu’on appelle ici les « tertres », sont pavées et très pentues.',
            'Arrivez tôt au village. Les parkings se remplissent vite en fin de matinée, en particulier d’avril à octobre.',
          ] },
          { h2: 'Jour 1, le matin : le village et ses souterrains' },
          'Commencez par l’office de tourisme, au pied du clocher. C’est de là que partent les visites guidées de l’église monolithe, creusée dans le calcaire entre le XIe et le XIIe siècle : l’une des plus vastes églises souterraines d’Europe, que l’on ne visite qu’accompagné. Réservez votre créneau dès votre arrivée, ou la veille.',
          'Montez ensuite à la Tour du Roy, un donjon du XIIIe siècle : la vue sur les toits de tuiles et sur les vignes qui encerclent le village vaut chaque marche. Gardez un moment pour la collégiale et son cloître, puis goûtez les macarons de Saint-Émilion, une recette transmise depuis le XVIIe siècle.',
          { h2: 'Jour 1, l’après-midi : un grand cru, de l’intérieur' },
          'Après le déjeuner, quittez le village pour une visite de château. L’appellation saint-émilion grand cru réunit des propriétés de toutes tailles, du domaine familial au premier grand cru classé ; une visite avec dégustation dure en général une heure à une heure et demie. Choisissez-en une ou deux, pas davantage : tout l’intérêt est de prendre le temps d’échanger avec ceux qui font le vin.',
          'En fin de journée, faites un détour par le cloître des Cordeliers, où l’on élabore des crémants dans d’anciennes caves creusées sous le village. Puis rentrez vous poser : une flambée dans la cheminée de votre suite, et la soirée commence.',
          { h2: 'Jour 2, le matin : les appellations voisines' },
          'Le lendemain, prenez la route des « satellites » de Saint-Émilion : Lussac, Montagne, Puisseguin et Saint-Georges. Moins courues, ces appellations offrent des coteaux plus vallonnés, des églises romanes et des propriétés familiales où l’on prend le temps de vous recevoir. Le Château Latour Ségur est au cœur de l’appellation Lussac-Saint-Émilion : en séjournant ici, vous y êtes déjà.',
          'Les amateurs de marchés pousseront jusqu’à Libourne, une bastide du XIIIe siècle à une vingtaine de minutes, dont la grande place à arcades s’anime les jours de marché.',
          { h2: 'Jour 2, l’après-midi : se ressourcer avant de repartir' },
          'Avant de reprendre la route, offrez-vous une pause au Spa TerreHappy®, sur le domaine : piscine chauffée, hammam, bain à remous, massages et soins. Il se réserve séparément, sur [spaterrehappy.fr](spa).',
          { h2: 'Où dormir pour ce week-end ?' },
          'Dormir au village permet de tout faire à pied. Dormir dans les vignes, à quelques minutes en voiture, offre le calme, l’espace et un parking. Au Château Latour Ségur, à une dizaine de kilomètres de Saint-Émilion, nos cinq suites occupent les dépendances du château, au calme du parc et de ses étangs, et toutes ont une cheminée. Pour comparer les options, lisez notre guide [Dormir dans un château près de Saint-Émilion](guide:dormir-chateau).',
          { suite: 'terre', text: 'Pour un week-end à deux ou à trois : une suite de 55 m² avec cheminée et bain à remous privé, pour finir les journées de visite en douceur.' },
          { h2: 'Quand venir ?' },
          'Le printemps et l’automne sont les plus belles saisons : vignes en feuilles, lumière douce, et les vendanges de septembre à octobre. La Jurade de Saint-Émilion, la confrérie des vins, défile en robes rouges dans le village pour la Fête du printemps, en juin, et le Ban des vendanges, en septembre. L’hiver est plus calme et certaines propriétés réduisent leurs visites, mais c’est la saison des soirées au coin du feu et d’un village sans la foule.',
          'Vous venez à deux ? Notre guide [Week-end en amoureux près de Saint-Émilion](guide:romantique) vous aide à choisir la suite et à composer le programme.',
        ],
      },
      en: {
        slug: 'saint-emilion-weekend-itinerary',
        category: 'Itinerary',
        title: 'What to do in Saint-Émilion in a weekend: our two-day itinerary',
        seoTitle: 'Saint-Émilion in a weekend: 2-day itinerary',
        description: 'The monolithic church, the King’s Tower, a grand cru visit, the neighbouring appellations and a spa: the two-day itinerary we suggest to our guests.',
        lead: 'Two days are enough to get the feel of Saint-Émilion: a honey-coloured stone village above the vines, a church carved into the rock and, all around, hundreds of wine châteaux. Here is the itinerary we suggest to our guests, designed to enjoy it all without rushing.',
        imageAlt: 'The estate’s vines at sunrise, near Saint-Émilion',
        body: [
          { h2: 'Before you go: three tips' },
          { list: [
            'Book your château visits ahead. Most estates only receive visitors by appointment, especially at weekends and out of season.',
            'Wear good shoes. The village lanes, known locally as “tertres”, are cobbled and very steep.',
            'Get to the village early. The car parks fill up by late morning, especially from April to October.',
          ] },
          { h2: 'Day 1, morning: the village and its underground church' },
          'Start at the tourist office, at the foot of the bell tower. This is where guided tours of the monolithic church set off: carved into the limestone between the 11th and 12th centuries, it is one of the largest underground churches in Europe and can only be visited with a guide. Book your slot as soon as you arrive, or the day before.',
          'Then climb the King’s Tower (Tour du Roy), a 13th-century keep: the view over the tiled roofs and the vines that ring the village is worth every step. Save some time for the collegiate church and its cloister, then try the Saint-Émilion macarons, a recipe handed down since the 17th century.',
          { h2: 'Day 1, afternoon: a grand cru from the inside' },
          'After lunch, leave the village for a château visit. The Saint-Émilion grand cru appellation brings together estates of every size, from small family properties to premiers grands crus classés; a visit with a tasting usually takes an hour to an hour and a half. Pick one or two, no more: the point is to take your time and talk with the people who make the wine.',
          'Late in the day, stop at the Cloître des Cordeliers, where sparkling crémant is made in old cellars dug beneath the village. Then head back to unwind: a fire in your suite’s hearth, and the evening begins.',
          { h2: 'Day 2, morning: the neighbouring appellations' },
          'The next day, take the road through Saint-Émilion’s “satellite” appellations: Lussac, Montagne, Puisseguin and Saint-Georges. Less visited, they have gentler rolling hills, Romanesque churches and family estates that take the time to welcome you. Château Latour Ségur sits in the heart of the Lussac-Saint-Émilion appellation: stay here and you are already there.',
          'If you love markets, carry on to Libourne, a 13th-century bastide town about twenty minutes away, whose large arcaded square comes alive on market days.',
          { h2: 'Day 2, afternoon: recharge before heading home' },
          'Before you hit the road, take a break at Spa TerreHappy®, on the estate: heated pool, hammam, whirlpool bath, massages and treatments. It is booked separately, on [spaterrehappy.fr](spa).',
          { h2: 'Where to stay for the weekend?' },
          'Staying in the village means you can walk everywhere. Staying among the vines, a few minutes’ drive away, gives you peace, space and parking. At Château Latour Ségur, about ten kilometres from Saint-Émilion, our five suites are in the château’s outbuildings, in the quiet of the park and its ponds, and every one has a fireplace. To compare your options, read our guide [Staying in a château near Saint-Émilion](guide:dormir-chateau).',
          { suite: 'terre', text: 'For a weekend for two or three: a 55 m² suite with a fireplace and a private whirlpool bath, to round off your days of sightseeing.' },
          { h2: 'When to come?' },
          'Spring and autumn are the loveliest seasons: vines in leaf, soft light, and the harvest from September to October. The Jurade de Saint-Émilion, the local wine brotherhood, parades through the village in red robes for the Spring Festival in June and the Harvest Proclamation in September. Winter is quieter and some estates offer fewer visits, but it is the season of evenings by the fire and a village without the crowds.',
          'Coming as a couple? Our guide [Romantic weekend near Saint-Émilion](guide:romantique) helps you choose your suite and plan your stay.',
        ],
      },
    },
  },
  {
    id: 'romantique',
    image: 'suite-bain',
    suite: 'eau',
    published: '2026-11-24',
    updated: '2026-11-24',
    related: ['week-end-saint-emilion', 'dormir-chateau'],
    text: {
      fr: {
        slug: 'week-end-amoureux-saint-emilion-jacuzzi-privatif',
        category: 'À deux',
        title: 'Week-end en amoureux près de Saint-Émilion : nos suites avec bain à remous privatif',
        seoTitle: 'Week-end en amoureux près de Saint-Émilion',
        description: 'Suite avec jacuzzi privatif et cheminée, spa sur place, programme à deux : comment composer un week-end romantique au château, près de Saint-Émilion.',
        lead: 'Un feu de cheminée, un bain à remous rien qu’à vous, un verre de saint-émilion et personne pour vous presser. Voici comment composer un week-end à deux au château, du choix de la suite au programme.',
        imageAlt: 'Un lit aux coussins verts et un bain à remous éclairé à la bougie, dans une suite du château',
        body: [
          { h2: 'Quelle suite choisir pour un week-end à deux ?' },
          'Nos cinq suites ont toutes une cheminée. Pour un bain à deux sans quitter votre suite, deux d’entre elles ont un bain à remous ou une balnéo privatifs.',
          { suite: 'terre', text: 'La plus vaste pour un couple : 55 m², un bain à remous privé, un coin salon et la cheminée pour les soirées.' },
          { suite: 'eau', text: 'Une balnéo pour deux, une douche à l’italienne, un feu de bois et une literie Tempur® : la suite pensée pour ralentir à deux.' },
          'Vous préférez une grande baignoire ? La [Suite Feu](/suites/feu), avec son atmosphère de maison de campagne, ou le [Cottage Bois](/suites/bois), indépendant avec sa terrasse sur le jardin, sont deux belles alternatives.',
          { h2: 'Le spa, à quelques pas' },
          'Le Spa TerreHappy® se trouve sur le domaine : piscine chauffée, hammam, bain à remous, massages et soins. Il se privatise pour un après-midi ou une soirée, de quoi préparer une demande en mariage ou un anniversaire en toute intimité. Il se réserve séparément, sur [spaterrehappy.fr](spa).',
          { h2: 'Un programme à deux, sans se presser' },
          { list: [
            'Le premier soir : arrivée au château, une flambée dans la cheminée, un bain.',
            'Le matin : petit-déjeuner servi au château sur demande, de 8 h 30 à 11 h, puis le village de Saint-Émilion, à une dizaine de kilomètres.',
            'L’après-midi : une visite et une dégustation dans un château viticole, réservées à l’avance.',
            'Le soir : dîner à Saint-Émilion ou à Libourne, puis retour au coin du feu.',
            'Le dernier jour : une balade dans le parc et autour des étangs, puis une séance au spa avant de repartir.',
          ] },
          'Pour le détail des visites au village, lisez notre guide [Que faire à Saint-Émilion en un week-end](guide:week-end-saint-emilion).',
          { h2: 'Offrir le week-end' },
          'Pour un anniversaire ou la Saint-Valentin, le séjour peut s’offrir sous forme de [bon cadeau](cadeau). Les Chèques-Vacances ANCV sont acceptés.',
          { h2: 'Réserver en direct' },
          'Sur ce site, vous choisissez votre suite dans le calendrier des nuits réellement libres, vous réglez en ligne de façon sécurisée et vous échangez directement avec Corinne et André. Un anniversaire à préparer, une arrivée tardive, une adresse à demander : il suffit de leur écrire. Vous pouvez aussi annuler ou modifier vous-même votre réservation pendant 24 heures après le paiement.',
        ],
      },
      en: {
        slug: 'romantic-weekend-saint-emilion-private-hot-tub',
        category: 'For two',
        title: 'Romantic weekend near Saint-Émilion: our suites with a private hot tub',
        seoTitle: 'Romantic weekend near Saint-Émilion',
        description: 'A suite with a private hot tub and fireplace, a spa on site and a plan for two: how to put together a romantic weekend at a château near Saint-Émilion.',
        lead: 'An open fire, a whirlpool bath all to yourselves, a glass of Saint-Émilion and nobody to hurry you. Here is how to put together a weekend for two at the château, from choosing your suite to planning your days.',
        imageAlt: 'A bed with green cushions and a candlelit whirlpool bath in one of the château’s suites',
        body: [
          { h2: 'Which suite for a weekend for two?' },
          'All five of our suites have a fireplace. For a bath for two without leaving your room, two of them have a private whirlpool or spa bath.',
          { suite: 'terre', text: 'The most spacious for a couple: 55 m², a private whirlpool bath, a sitting area and a fireplace for the evenings.' },
          { suite: 'eau', text: 'A whirlpool bath for two, a walk-in shower, a wood fire and Tempur® bedding: the suite designed for slowing down together.' },
          'Prefer a large bathtub? The [Fire Suite](/en/suites/feu), with its country-house atmosphere, or the self-contained [Wood Cottage](/en/suites/bois), with its terrace onto the garden, are two lovely alternatives.',
          { h2: 'The spa, a few steps away' },
          'Spa TerreHappy® is on the estate: heated pool, hammam, whirlpool bath, massages and treatments. It can be booked privately for an afternoon or an evening, perfect for a proposal or a birthday surprise. It is booked separately, on [spaterrehappy.fr](spa).',
          { h2: 'A plan for two, at your own pace' },
          { list: [
            'First evening: arrive at the château, light the fire, run a bath.',
            'Morning: breakfast served at the château on request, from 8:30 to 11 am, then the village of Saint-Émilion, about ten kilometres away.',
            'Afternoon: a visit and tasting at a wine château, booked ahead.',
            'Evening: dinner in Saint-Émilion or Libourne, then back to the fireside.',
            'Last day: a stroll through the park and around the ponds, then a spa session before you leave.',
          ] },
          'For the village sights in detail, read our guide [What to do in Saint-Émilion in a weekend](guide:week-end-saint-emilion).',
          { h2: 'Give the weekend as a gift' },
          'For a birthday or Valentine’s Day, a stay can be given as a [gift voucher](cadeau). ANCV Chèques-Vacances are accepted.',
          { h2: 'Book direct' },
          'On this site you choose your suite from a calendar of nights that are actually free, pay securely online and deal directly with Corinne and André. A birthday to prepare, a late arrival, a recommendation to ask for: just write to them. You can also cancel or change your booking yourself within 24 hours of payment.',
        ],
      },
    },
  },
  {
    id: 'dormir-chateau',
    image: 'domaine-facade',
    suite: 'feu',
    published: '2026-11-24',
    updated: '2026-11-24',
    related: ['week-end-saint-emilion', 'romantique'],
    text: {
      fr: {
        slug: 'dormir-dans-un-chateau-pres-de-saint-emilion',
        category: 'Bien choisir',
        title: 'Dormir dans un château près de Saint-Émilion : comment bien choisir',
        seoTitle: 'Dormir dans un château près de Saint-Émilion',
        description: 'Château-hôtel ou chambres d’hôtes, village ou vignes, suite ou chambre : les bonnes questions avant de réserver une nuit au château près de Saint-Émilion.',
        lead: 'Château-hôtel, chambres d’hôtes, gîte dans les vignes : autour de Saint-Émilion, « dormir au château » recouvre des expériences très différentes. Quelques repères pour choisir celle qui vous ressemble.',
        imageAlt: 'La façade du Château Latour Ségur, à Lussac, près de Saint-Émilion',
        body: [
          { h2: 'Au village ou dans les vignes ?' },
          'Dormir dans le village de Saint-Émilion, c’est tout faire à pied, mais composer avec les ruelles pentues, le stationnement payant et l’animation de la haute saison. Dormir dans un château des environs, c’est le calme, de l’espace, un parc et un parking, à condition d’avoir une voiture : comptez un petit quart d’heure de route entre le Château Latour Ségur et le village.',
          { h2: 'Château-hôtel ou chambres d’hôtes ?' },
          'Un château-hôtel offre une réception, souvent un restaurant et des services, avec plusieurs dizaines de chambres. Des chambres d’hôtes dans un château, ce sont quelques chambres ou suites seulement, des propriétaires qui vous accueillent eux-mêmes et vous confient leurs adresses : une atmosphère de maison plus que d’hôtel. C’est notre choix au Château Latour Ségur, avec cinq suites et Corinne et André pour vous recevoir.',
          { h2: 'Les questions à se poser avant de réserver' },
          { list: [
            'Chambre ou suite ? Au-delà d’une nuit, l’espace d’une suite, avec un salon ou un coin cuisine, change tout.',
            'Cheminée, baignoire, bain à remous : vérifiez que l’équipement dont vous rêvez est bien dans votre chambre, et pas seulement quelque part dans l’établissement.',
            'Durée minimum : beaucoup de maisons demandent deux nuits, surtout le week-end.',
            'Petit-déjeuner : compris ou en option, et à quelle heure ?',
            'Annulation : lisez les conditions avant de payer, en particulier pour un séjour lointain.',
            'Accès : hors du village, une voiture est presque indispensable, et un parking privé devient un vrai confort.',
          ] },
          { h2: 'Le Château Latour Ségur en quelques mots' },
          'Le château se trouve à Lussac, au cœur de l’appellation Lussac-Saint-Émilion, à une dizaine de kilomètres du village de Saint-Émilion et à moins d’une heure de Bordeaux. Les cinq suites occupent les dépendances, au calme du parc et de ses étangs ; chacune a sa cheminée, et le Spa TerreHappy® est sur le domaine. Le Wi-Fi, le parking privé et le linge sont compris, et le petit-déjeuner est servi sur demande.',
          { suite: 'feu', text: 'Pour un séjour à deux au coin du feu : une atmosphère de maison de campagne, une cheminée et une baignoire pour se prélasser.' },
          { suite: 'metal', text: 'Pour venir en famille ou entre amis : deux chambres, une cuisine équipée et une cheminée, jusqu’à 4 personnes.' },
          'Envie d’un bain à remous privatif ? Notre guide [Week-end en amoureux près de Saint-Émilion](guide:romantique) présente les deux suites qui en ont un.',
          { h2: 'Pourquoi réserver en direct' },
          'Sur ce site, le calendrier n’affiche que les nuits réellement libres, le paiement est sécurisé et la confirmation arrive aussitôt. Surtout, vous gardez un lien direct avec vos hôtes : une question avant de venir, une arrivée tardive, une bouteille à faire préparer, il suffit de leur écrire.',
          'Et pour remplir vos journées, suivez notre [itinéraire de deux jours à Saint-Émilion](guide:week-end-saint-emilion).',
        ],
      },
      en: {
        slug: 'stay-in-a-chateau-near-saint-emilion',
        category: 'Choosing well',
        title: 'Staying in a château near Saint-Émilion: how to choose',
        seoTitle: 'Staying in a château near Saint-Émilion',
        description: 'Château hotel or B&B, village or vineyards, room or suite: the right questions to ask before booking a night in a château near Saint-Émilion.',
        lead: 'Château hotel, bed and breakfast, cottage among the vines: around Saint-Émilion, “staying in a château” covers very different experiences. A few pointers to help you choose the one that suits you.',
        imageAlt: 'The façade of Château Latour Ségur in Lussac, near Saint-Émilion',
        body: [
          { h2: 'In the village or among the vines?' },
          'Staying in the village of Saint-Émilion means you can walk everywhere, but also steep lanes, paid parking and the bustle of high season. Staying in a château nearby means peace, space, a park and parking, as long as you have a car: allow about fifteen minutes’ drive between Château Latour Ségur and the village.',
          { h2: 'Château hotel or bed and breakfast?' },
          'A château hotel offers a reception desk, often a restaurant and services, with dozens of rooms. A château bed and breakfast has just a few rooms or suites, and owners who welcome you themselves and share their favourite places: it feels more like a home than a hotel. That is our choice at Château Latour Ségur, with five suites and Corinne and André to welcome you.',
          { h2: 'Questions to ask before you book' },
          { list: [
            'Room or suite? For more than one night, the space of a suite, with a sitting room or kitchen corner, makes all the difference.',
            'Fireplace, bathtub, whirlpool: check that the feature you are dreaming of is in your own room, not just somewhere on the property.',
            'Minimum stay: many houses ask for two nights, especially at weekends.',
            'Breakfast: included or optional, and at what time?',
            'Cancellation: read the terms before you pay, especially for a stay far ahead.',
            'Getting there: outside the village a car is almost essential, and private parking is a real comfort.',
          ] },
          { h2: 'Château Latour Ségur in a nutshell' },
          'The château is in Lussac, in the heart of the Lussac-Saint-Émilion appellation, about ten kilometres from the village of Saint-Émilion and less than an hour from Bordeaux. The five suites are in the outbuildings, in the quiet of the park and its ponds; every one has a fireplace, and Spa TerreHappy® is on the estate. Wi-Fi, private parking and linen are included, and breakfast is served on request.',
          { suite: 'feu', text: 'For a stay for two by the fire: a country-house atmosphere, a fireplace and a bathtub to linger in.' },
          { suite: 'metal', text: 'For families or friends: two bedrooms, a fitted kitchen and a fireplace, for up to 4 guests.' },
          'Fancy a private hot tub? Our guide [Romantic weekend near Saint-Émilion](guide:romantique) introduces the two suites that have one.',
          { h2: 'Why book direct' },
          'On this site the calendar only shows nights that are actually free, payment is secure and your confirmation arrives straight away. Above all, you stay in direct touch with your hosts: a question before you come, a late arrival, a bottle to have ready, just write to them.',
          'And to fill your days, follow our [two-day Saint-Émilion itinerary](guide:week-end-saint-emilion).',
        ],
      },
    },
  },
]

export const guidesIndexPaths: Record<Lang, string> = { fr: '/guides', en: '/en/guides' }

export const guidePaths = (guide: Guide): Record<Lang, string> => ({
  fr: `/guides/${guide.text.fr.slug}`,
  en: `/en/guides/${guide.text.en.slug}`,
})

export const guideById = (id: GuideId) => guides.find((guide) => guide.id === id)!

/** Temps de lecture, en minutes (environ 220 mots par minute). */
export function readingMinutes(text: GuideText) {
  const words = [text.lead, ...text.body.map((block) => typeof block === 'string' ? block : 'h2' in block ? block.h2 : 'list' in block ? block.list.join(' ') : block.text)]
    .join(' ').split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}
