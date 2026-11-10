import type { Lang } from './i18n'

export const SPA_URL = 'https://spaterrehappy.fr/'
/** Boutique des bons cadeaux (Secretbox). */
export const GIFT_URL = 'https://chateaulatoursegur.secretbox.fr/'

export type UniverseId = 'suites' | 'spa' | 'evenements'

export interface Universe {
  id: UniverseId
  number: string
  label: string
  art: string
  title: [string, string]
  tagline: string
  image: string
  imageAlt: string
  heading: [string, string]
  description: string
  detail: string
  features: string[]
  action: string
  options: { title: string; text: string; suite?: SuiteId }[]
}

export const universes: Record<Lang, Universe[]> = {
  fr: [
    {
      id: 'suites',
      number: '01',
      label: 'Les suites',
      art: 'L’art de séjourner',
      title: ['Les Suites', 'du château'],
      tagline: 'Des nuits douces, des matins à soi.',
      image: 'chateau-panorama',
      imageAlt: 'Les vieilles pierres des dépendances du château, qui abritent les suites',
      heading: ['Se sentir ailleurs.', 'Se sentir chez soi.'],
      description: 'Une porte que l’on pousse, la douceur d’une lumière, le charme des matières. Dans les dépendances du château, nos suites cultivent cet équilibre précieux entre le caractère d’une maison ancienne et le confort d’un refuge intime.',
      detail: 'Inspirées des cinq éléments, elles ont chacune leur personnalité. À vous de trouver celle qui vous ressemble, puis de laisser le temps faire le reste.',
      features: ['Suites de caractère', 'Cheminées & balnéo', 'Au calme du parc'],
      action: 'Explorer les suites',
      options: [
        { suite: 'terre', title: 'La Suite Terre', text: 'Un vaste refuge aux tons de pierre et de bois, avec cheminée et bain à remous privé, pour prendre ses aises à deux.' },
        { suite: 'eau', title: 'La Suite Eau', text: 'Un univers de douceur et de fluidité, pensé pour ralentir à deux et retrouver le plaisir des choses simples.' },
        { suite: 'metal', title: 'La Suite Métal', text: 'La plus spacieuse : deux chambres, une cheminée, une grande baignoire et une cuisine équipée. Idéale en famille ou entre amis.' },
        { suite: 'feu', title: 'La Suite Feu', text: 'Une atmosphère enveloppante, le charme d’une cheminée et l’esprit chaleureux d’une véritable maison de campagne.' },
        { suite: 'bois', title: 'Le Cottage Bois', text: 'Les nuances du blé, de la pierre et du bois. Un refuge indépendant avec cheminée et terrasse sur le jardin, pour vivre le domaine à votre rythme.' },
      ],
    },
    {
      id: 'spa',
      number: '02',
      label: 'Le Spa TerreHappy®',
      art: 'L’art de se ressourcer',
      title: ['Le Spa', 'TerreHappy®'],
      tagline: 'Un retour à soi, en toute intimité.',
      image: 'spa-piscine',
      imageAlt: 'Le bassin du spa dans une cour intime aux murs de pierre, à la tombée du jour',
      heading: ['Le corps s’apaise.', 'L’esprit s’évade.'],
      description: 'L’eau, la chaleur, le silence. Au Spa TerreHappy®, tout invite à renouer avec ses sensations. Un cocon creusé dans la pierre, où les soins et les gestes attentifs ouvrent une parenthèse rien qu’à vous, loin de l’agitation du quotidien.',
      detail: 'Piscine chauffée, hammam, bain à remous, massages et soins : ouvert aux hôtes des suites comme aux visiteurs, et privatisable.',
      features: ['Ouvert à tous', 'Soins & massages', 'Privatisable'],
      action: 'Découvrir le spa sur spaterrehappy.fr',
      options: [
        { title: 'Votre spa privé', text: 'Une journée, un après-midi ou une soirée : l’espace spa et détente se réserve pour profiter du lieu en toute intimité.' },
        { title: 'Les soins TerreHappy®', text: 'Des gestes attentifs et un accompagnement personnalisé. Échangeons sur vos envies pour choisir le soin qui vous correspond.' },
        { title: 'Une parenthèse à partager', text: 'En couple ou entre amis, offrez-vous un temps de détente partagé dans le cadre apaisant du domaine.' },
      ],
    },
    {
      id: 'evenements',
      number: '03',
      label: 'Séminaires & événements',
      art: 'L’art de se réunir',
      title: ['Séminaires', '& Événements'],
      tagline: 'De belles idées, de vrais liens.',
      image: 'cuvier',
      imageAlt: 'La salle voûtée du cuvier, sa grande cheminée allumée et ses tables dressées',
      heading: ['Se retrouver.', 'Faire naître l’inattendu.'],
      description: 'Il est des lieux qui donnent une autre dimension aux rencontres. Entre vieilles pierres et nature, le château accueille vos séminaires, réceptions et célébrations dans un cadre à la fois inspirant, chaleureux et résolument à part.',
      detail: 'Une journée pour penser ensemble, un moment pour célébrer, des souvenirs à créer. Parlons de votre projet : nous lui donnerons une forme singulière.',
      features: ['Séminaires au vert', 'Réceptions privées', 'Sur mesure'],
      action: 'Imaginer votre événement',
      options: [
        { title: 'Les séminaires au vert', text: 'Quitter le cadre habituel pour ouvrir de nouvelles perspectives. Une rencontre d’équipe à imaginer selon vos objectifs et votre rythme.' },
        { title: 'Les réceptions privées', text: 'Réunir ceux qui comptent dans une demeure de caractère. Un anniversaire, une fête de famille, une occasion précieuse.' },
        { title: 'Votre projet, sur mesure', text: 'Parlez-nous de vos envies, du nombre de convives et de vos dates. Nous étudierons ensemble les possibilités du domaine.' },
      ],
    },
  ],
  en: [
    {
      id: 'suites',
      number: '01',
      label: 'The suites',
      art: 'The art of staying',
      title: ['The Château', 'Suites'],
      tagline: 'Gentle nights, unhurried mornings.',
      image: 'chateau-panorama',
      imageAlt: 'The old stone outbuildings of the château, home to the suites',
      heading: ['Somewhere else.', 'And yet at home.'],
      description: 'A door swinging open, soft light, beautiful textures. Set in the château’s outbuildings, our suites strike a rare balance between the character of an old house and the comfort of an intimate hideaway.',
      detail: 'Inspired by the five elements, each has its own personality. Find the one that feels like you, then let time do the rest.',
      features: ['Characterful suites', 'Fireplaces & whirlpools', 'In a quiet park'],
      action: 'Explore the suites',
      options: [
        { suite: 'terre', title: 'The Earth Suite', text: 'A generous retreat in shades of stone and wood, with a fireplace and private whirlpool bath — room to unwind together.' },
        { suite: 'eau', title: 'The Water Suite', text: 'A soft, flowing world designed for slowing down as a couple and rediscovering simple pleasures.' },
        { suite: 'metal', title: 'The Metal Suite', text: 'Our most spacious: two bedrooms, a fireplace, a large bathtub and a fitted kitchen. Ideal for families or friends.' },
        { suite: 'feu', title: 'The Fire Suite', text: 'A cocooning atmosphere, the charm of an open fire and the warm spirit of a true country house.' },
        { suite: 'bois', title: 'The Wood Cottage', text: 'Shades of wheat, stone and timber. A self-contained hideaway with a fireplace and a terrace onto the garden, to enjoy the estate at your own pace.' },
      ],
    },
    {
      id: 'spa',
      number: '02',
      label: 'Spa TerreHappy®',
      art: 'The art of unwinding',
      title: ['The Spa', 'TerreHappy®'],
      tagline: 'Back to yourself, in complete privacy.',
      image: 'spa-piscine',
      imageAlt: 'The spa pool in an intimate stone-walled courtyard at dusk',
      heading: ['The body relaxes.', 'The mind drifts away.'],
      description: 'Water, warmth, silence. At Spa TerreHappy®, everything invites you to reconnect with your senses. A cocoon carved into the stone, where attentive hands and tailored treatments open a moment that is yours alone, far from everyday life.',
      detail: 'Heated pool, hammam, whirlpool bath, massages and treatments: open to suite guests and day visitors alike, and available for private hire.',
      features: ['Open to all', 'Treatments & massages', 'Private hire'],
      action: 'Discover the spa on spaterrehappy.fr',
      options: [
        { title: 'Your private spa', text: 'A day, an afternoon or an evening: the spa and relaxation area can be reserved so you enjoy it in complete privacy.' },
        { title: 'TerreHappy® treatments', text: 'Attentive hands and personal advice. Tell us what you are looking for and we will help you choose the right treatment.' },
        { title: 'A moment to share', text: 'As a couple or with friends, treat yourselves to some shared relaxation in the peaceful setting of the estate.' },
      ],
    },
    {
      id: 'evenements',
      number: '03',
      label: 'Meetings & events',
      art: 'The art of gathering',
      title: ['Meetings', '& Events'],
      tagline: 'Bright ideas, real connections.',
      image: 'cuvier',
      imageAlt: 'The vaulted vat room with its great open fire and laid tables',
      heading: ['Come together.', 'Make room for the unexpected.'],
      description: 'Some places give gatherings another dimension. Between old stone and nature, the château hosts your seminars, receptions and celebrations in a setting that is inspiring, warm and quite unlike anywhere else.',
      detail: 'A day to think together, a moment to celebrate, memories to make. Tell us about your project and we will give it a shape of its own.',
      features: ['Away-day seminars', 'Private receptions', 'Tailor-made'],
      action: 'Plan your event',
      options: [
        { title: 'Seminars in the countryside', text: 'Step out of the office to open up new perspectives. A team gathering shaped around your goals and your pace.' },
        { title: 'Private receptions', text: 'Bring together the people who matter in a house full of character. A birthday, a family celebration, a precious occasion.' },
        { title: 'Your project, tailor-made', text: 'Tell us what you have in mind, how many guests and which dates. We will explore the estate’s possibilities together.' },
      ],
    },
  ],
}

export type SuiteId = 'terre' | 'eau' | 'metal' | 'feu' | 'bois'
const suiteIds: SuiteId[] = ['terre', 'eau', 'metal', 'feu', 'bois']
const suitesOf = (lang: Lang) => suiteIds.map((id) => ({ id, label: universes[lang][0].options.find((option) => option.suite === id)!.title }))
export { suiteIds }
export const suites: Record<Lang, { id: SuiteId; label: string }[]> = { fr: suitesOf('fr'), en: suitesOf('en') }

/**
 * Les photos de chaque suite : tout fichier déposé dans src/assets/suites/<suite>/ est publié
 * automatiquement, dans l'ordre alphabétique des noms de fichiers (voir le README du dossier).
 */
const suitePhotoFiles = import.meta.glob<string>('../assets/suites/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' })
const byName = new Intl.Collator('fr', { numeric: true }).compare
export const suitePhotos = Object.fromEntries(suiteIds.map((id) => [id, Object.keys(suitePhotoFiles)
  .filter((path) => path.split('/').at(-2) === id)
  .sort(byName)
  .map((path) => suitePhotoFiles[path])])) as Record<SuiteId, string[]>

/** `href` : l’échappée renvoie directement vers un site externe (le spa) au lieu d’ouvrir sa fiche. */
export interface SuiteDetail {
  /** Accroche courte, sous le nom de la suite. */
  tagline: string
  /** Présentation de la suite, paragraphe par paragraphe. */
  story: string[]
  surface: string
  guests: string
  beds: string
  /** Équipements propres à la suite. */
  features: string[]
}

/**
 * Le détail de chaque suite (page /suites/<suite>).
 * Surfaces, couchages et équipements repris des annonces de réservation du château : à vérifier.
 */
export const suiteDetails: Record<Lang, Record<SuiteId, SuiteDetail>> = {
  fr: {
    terre: {
      tagline: 'Pierre, bois et bain à remous, pour prendre ses aises.',
      story: [
        'La Suite Terre est un vaste refuge aux tons de pierre et de bois. On y pose ses valises pour plusieurs jours, sans compter : le feu crépite dans la cheminée, le bain à remous privé attend la fin de la journée.',
        'Ses volumes généreux accueillent deux personnes en toute aisance, et jusqu’à trois avec le lit d’appoint.',
      ],
      surface: '55 m²',
      guests: 'Jusqu’à 3 personnes',
      beds: '1 grand lit et 1 lit simple',
      features: ['Cheminée', 'Bain à remous privé', 'Coin salon', 'Coin cuisine', 'Vue sur le jardin'],
    },
    eau: {
      tagline: 'Un univers de douceur, pensé pour ralentir à deux.',
      story: [
        'La Suite Eau joue la fluidité et la légèreté. Une balnéo pour deux, une douche à l’italienne, un feu de bois les soirs plus frais : tout invite à retrouver le plaisir des choses simples.',
        'Sa literie Tempur® et son accès au jardin en font une adresse idéale pour une escapade en amoureux.',
      ],
      surface: '30 m²',
      guests: '2 personnes',
      beds: '1 lit king-size Tempur®',
      features: ['Balnéo pour deux', 'Douche à l’italienne', 'Cheminée à bois', 'Kitchenette', 'Accès au jardin'],
    },
    metal: {
      tagline: 'La plus spacieuse, pour se retrouver en famille ou entre amis.',
      story: [
        'Avec ses deux chambres, la Suite Métal est faite pour les séjours à plusieurs. Chacun y trouve son coin, puis tout le monde se retrouve autour de la cheminée ou de la table de la cuisine.',
        'Une grande baignoire, une cuisine équipée et de beaux volumes : de quoi vivre le domaine comme une maison.',
      ],
      surface: '65 m²',
      guests: 'Jusqu’à 4 personnes',
      beds: '2 chambres : 1 lit king-size et 1 grand lit',
      features: ['Deux chambres', 'Cheminée', 'Grande baignoire', 'Cuisine équipée', 'Salon'],
    },
    feu: {
      tagline: 'Une atmosphère enveloppante, au coin du feu.',
      story: [
        'La Suite Feu a l’esprit chaleureux d’une véritable maison de campagne. Les flammes de la cheminée, une baignoire pour se prélasser, des matières qui réchauffent : on y entre et l’on ne pense plus à rien.',
        'Une suite romantique, pour deux, à savourer en toute saison.',
      ],
      surface: '36 m²',
      guests: '2 personnes',
      beds: '1 lit king-size',
      features: ['Cheminée', 'Baignoire', 'Climatisation', 'Réfrigérateur', 'Télévision'],
    },
    bois: {
      tagline: 'Un cottage indépendant, ouvert sur le jardin.',
      story: [
        'Le Cottage Bois se tient un peu à l’écart, dans les nuances du blé, de la pierre et du bois. Une porte à soi, une terrasse sur le jardin, une cheminée pour les soirées.',
        'Le refuge rêvé pour vivre le domaine à votre rythme.',
      ],
      surface: '28 m²',
      guests: '2 personnes',
      beds: '1 lit king-size',
      features: ['Cottage indépendant', 'Cheminée', 'Terrasse sur le jardin', 'Douche', 'Climatisation'],
    },
  },
  en: {
    terre: {
      tagline: 'Stone, wood and a whirlpool bath — room to unwind.',
      story: [
        'The Earth Suite is a generous retreat in shades of stone and wood. It is made for staying a few days without counting: a fire crackling in the hearth, a private whirlpool bath waiting at the end of the day.',
        'Its spacious rooms comfortably welcome two, and up to three with the extra bed.',
      ],
      surface: '55 m²',
      guests: 'Up to 3 guests',
      beds: '1 double bed and 1 single bed',
      features: ['Fireplace', 'Private whirlpool bath', 'Sitting area', 'Kitchenette', 'Garden view'],
    },
    eau: {
      tagline: 'A soft, flowing world, designed for slowing down as a couple.',
      story: [
        'The Water Suite is all about lightness. A whirlpool bath for two, a walk-in shower, a wood fire on cooler evenings: everything invites you to rediscover simple pleasures.',
        'Its Tempur® bedding and access to the garden make it an ideal hideaway for a romantic getaway.',
      ],
      surface: '30 m²',
      guests: '2 guests',
      beds: '1 king-size Tempur® bed',
      features: ['Whirlpool bath for two', 'Walk-in shower', 'Wood fireplace', 'Kitchenette', 'Garden access'],
    },
    metal: {
      tagline: 'Our most spacious, for families or friends.',
      story: [
        'With two bedrooms, the Metal Suite is made for staying together. Everyone has a corner of their own, then gathers by the fire or around the kitchen table.',
        'A large bathtub, a fitted kitchen and generous volumes: live the estate as if it were your own house.',
      ],
      surface: '65 m²',
      guests: 'Up to 4 guests',
      beds: '2 bedrooms: 1 king-size and 1 double bed',
      features: ['Two bedrooms', 'Fireplace', 'Large bathtub', 'Fitted kitchen', 'Living room'],
    },
    feu: {
      tagline: 'A cocooning atmosphere, by the fire.',
      story: [
        'The Fire Suite has the warm spirit of a true country house. Flames in the hearth, a bathtub to linger in, textures that warm you up: step inside and leave everything else behind.',
        'A romantic suite for two, to enjoy in every season.',
      ],
      surface: '36 m²',
      guests: '2 guests',
      beds: '1 king-size bed',
      features: ['Fireplace', 'Bathtub', 'Air conditioning', 'Fridge', 'Television'],
    },
    bois: {
      tagline: 'A self-contained cottage opening onto the garden.',
      story: [
        'The Wood Cottage stands a little apart, in shades of wheat, stone and timber. A door of your own, a terrace onto the garden, a fireplace for the evenings.',
        'The perfect hideaway to enjoy the estate at your own pace.',
      ],
      surface: '28 m²',
      guests: '2 guests',
      beds: '1 king-size bed',
      features: ['Self-contained cottage', 'Fireplace', 'Garden terrace', 'Shower', 'Air conditioning'],
    },
  },
}

/** Équipements et services communs à toutes les suites. */
export const suiteCommon: Record<Lang, string[]> = {
  fr: ['Wi-Fi gratuit', 'Parking privé gratuit', 'Linge de lit et de toilette', 'Petit-déjeuner sur demande', 'Parc, étangs et jardin', 'Spa TerreHappy® sur place'],
  en: ['Free Wi-Fi', 'Free private parking', 'Bed linen and towels', 'Breakfast on request', 'Park, ponds and garden', 'Spa TerreHappy® on site'],
}

export interface Escape { id: string; label: string; title: string; image: string; alt: string; text: string; universe: UniverseId; request: string; href?: string }
export const escapes: Record<Lang, Escape[]> = {
  fr: [
    { id: 'romantique', label: 'Une escapade à deux', title: 'À deux, loin du monde.', image: 'suite-bain', alt: 'Un lit aux coussins verts et un bain à remous éclairé à la bougie, dans la Suite Métal', text: 'Un réveil sans réveil, une balade dans le parc, une pause au spa. Retrouvez le plaisir d’être simplement ensemble.', universe: 'suites', request: 'Je souhaite en savoir plus sur un week-end romantique au château.' },
    { id: 'ressourcement', label: 'Cures & bien-être', title: 'Retrouver son équilibre.', image: 'bain-bougies', alt: 'Une grande baignoire creusée dans la pierre, éclairée par un chandelier', text: 'Accorder au corps et à l’esprit le temps dont ils ont besoin. Une parenthèse de soins à composer selon vos envies.', universe: 'spa', request: 'Je souhaite composer une cure de bien-être et de ressourcement.', href: SPA_URL },
    { id: 'partage', label: 'Des moments à partager', title: 'Le bonheur d’être réunis.', image: 'salle-a-manger', alt: 'La salle à manger du château aux lustres allumés, la table dressée aux chandelles', text: 'Une grande tablée, des conversations qui s’étirent et des liens qui se renforcent. Les plus beaux souvenirs se vivent à plusieurs.', universe: 'evenements', request: 'Je souhaite organiser une escapade de groupe ou une réception au château.' },
  ],
  en: [
    { id: 'romantique', label: 'A getaway for two', title: 'Just the two of you.', image: 'suite-bain', alt: 'A bed with green cushions and a candlelit whirlpool bath in the Metal Suite', text: 'Waking up without an alarm, a stroll through the park, a moment at the spa. Rediscover the joy of simply being together.', universe: 'suites', request: 'I would like to know more about a romantic weekend at the château.' },
    { id: 'ressourcement', label: 'Wellness retreats', title: 'Find your balance again.', image: 'bain-bougies', alt: 'A large bathtub set into the stone, lit by a candelabra', text: 'Give body and mind the time they need. A treatment break put together around your wishes.', universe: 'spa', request: 'I would like to put together a wellness and relaxation retreat.', href: SPA_URL },
    { id: 'partage', label: 'Moments to share', title: 'The joy of being together.', image: 'salle-a-manger', alt: 'The château dining room with its chandeliers lit and a candlelit table', text: 'A long table, conversations that linger and bonds that grow stronger. The best memories are made together.', universe: 'evenements', request: 'I would like to organise a group getaway or a reception at the château.' },
  ],
}

export type GalleryCategory = UniverseId | 'domaine'
export type GalleryFilter = 'tous' | GalleryCategory
/** `image` : photo de public/images ; `src` : photo déposée dans src/assets/suites. */
export interface GalleryPhoto { id: string; category: GalleryCategory; image?: string; src?: string; title: string; alt: string }
export const galleryPhotos: Record<Lang, GalleryPhoto[]> = {
  fr: [
    { id: 'domaine-allee', category: 'domaine', image: 'domaine-allee', title: 'L’arrivée au château', alt: 'L’allée de gravier qui mène à la façade du château, entre pelouses et grands arbres' },
    { id: 'domaine-facade', category: 'domaine', image: 'domaine-facade', title: 'La demeure', alt: 'La façade du château au printemps, derrière les arbres en fleurs du jardin' },
    { id: 'cuvier', category: 'evenements', image: 'cuvier', title: 'Le cuvier', alt: 'La salle voûtée du cuvier, sa grande cheminée allumée et ses tables dressées' },
    { id: 'domaine-etang', category: 'domaine', image: 'domaine-etang', title: 'Au bord de l’étang', alt: 'L’étang du domaine bordé d’arbres, sous un ciel d’été' },
    { id: 'domaine-pigeonnier', category: 'domaine', image: 'domaine-pigeonnier', title: 'Le pigeonnier', alt: 'Le pigeonnier en pierre au milieu des vignes dorées' },
    { id: 'salle-a-manger', category: 'evenements', image: 'salle-a-manger', title: 'La salle à manger', alt: 'La salle à manger du château aux lustres allumés, la table dressée aux chandelles' },
    { id: 'domaine-allee-arbres', category: 'domaine', image: 'domaine-allee-arbres', title: 'L’allée centrale', alt: 'L’allée centrale du parc, ombragée par une double rangée d’arbres' },
    { id: 'domaine-dependances', category: 'domaine', image: 'domaine-dependances', title: 'Les dépendances', alt: 'Les dépendances en pierre qui abritent les suites, devant la pelouse fleurie' },
    { id: 'domaine-pont', category: 'domaine', image: 'domaine-pont', title: 'Le vieux pont', alt: 'Un petit pont de pierre ancien au bord des vignes' },
    { id: 'cave', category: 'evenements', image: 'cave', title: 'La cave', alt: 'La cave voûtée et sa longue table de bois éclairée aux bougies' },
    { id: 'domaine-automne', category: 'domaine', image: 'domaine-automne', title: 'L’automne', alt: 'Un arbre aux feuilles d’or au-dessus d’un tapis de feuilles mortes' },
    { id: 'domaine-vignes-aube', category: 'domaine', image: 'domaine-vignes-aube', title: 'L’aube sur les vignes', alt: 'Le ciel rose de l’aube au-dessus des vignes dans la brume' },
  ],
  en: [
    { id: 'domaine-allee', category: 'domaine', image: 'domaine-allee', title: 'Arriving at the château', alt: 'The gravel drive leading to the château façade, between lawns and tall trees' },
    { id: 'domaine-facade', category: 'domaine', image: 'domaine-facade', title: 'The house', alt: 'The château façade in spring, behind the blossoming trees of the garden' },
    { id: 'cuvier', category: 'evenements', image: 'cuvier', title: 'The vat room', alt: 'The vaulted vat room with its great open fire and laid tables' },
    { id: 'domaine-etang', category: 'domaine', image: 'domaine-etang', title: 'By the pond', alt: 'The estate pond lined with trees under a summer sky' },
    { id: 'domaine-pigeonnier', category: 'domaine', image: 'domaine-pigeonnier', title: 'The dovecote', alt: 'The stone dovecote among golden vines' },
    { id: 'salle-a-manger', category: 'evenements', image: 'salle-a-manger', title: 'The dining room', alt: 'The château dining room with its chandeliers lit and a candlelit table' },
    { id: 'domaine-allee-arbres', category: 'domaine', image: 'domaine-allee-arbres', title: 'The central avenue', alt: 'The park’s central avenue, shaded by a double row of trees' },
    { id: 'domaine-dependances', category: 'domaine', image: 'domaine-dependances', title: 'The outbuildings', alt: 'The stone outbuildings that house the suites, beyond a flowering lawn' },
    { id: 'domaine-pont', category: 'domaine', image: 'domaine-pont', title: 'The old bridge', alt: 'A small old stone bridge at the edge of the vines' },
    { id: 'cave', category: 'evenements', image: 'cave', title: 'The cellar', alt: 'The vaulted cellar and its long wooden table lit by candles' },
    { id: 'domaine-automne', category: 'domaine', image: 'domaine-automne', title: 'Autumn', alt: 'A tree with golden leaves above a carpet of fallen leaves' },
    { id: 'domaine-vignes-aube', category: 'domaine', image: 'domaine-vignes-aube', title: 'Dawn over the vines', alt: 'The pink dawn sky above misty vineyards' },
  ],
}


export const contact = {
  phone: '+33 (0)5 57 51 06 72',
  phoneLink: '+33557510672',
  email: 'contact@chateaulatoursegur.com',
  address: '1, lieu-dit Latour',
  locality: '33570 Lussac — Saint-Émilion',
  map: 'https://www.google.com/maps/search/?api=1&query=Ch%C3%A2teau+Latour+S%C3%A9gur+1+Latour+33570+Lussac',
}

export const SITE_URL = 'https://www.chambredhotesaintemilion.fr'

export const legal = {
  company: 'Château Latour Ségur Suites & Spa TerreHappy®',
  publisher: 'Corinne Dray',
  designer: 'Macéo Bonalair',
  host: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com',
}
