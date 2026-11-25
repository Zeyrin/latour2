import { GIFT_URL } from './content'
import type { Lang } from './i18n'

/**
 * Page « Cartes cadeaux et séjours à offrir » (/cartes-cadeaux, /en/gift-vouchers).
 *
 * Pour l'instant, l'achat se fait sur la boutique Secretbox du château (GIFT_URL) : chaque offre renvoie vers
 * sa page Secretbox. Prix et contenus recopiés de Secretbox le 25/11/2026 : les modifier ici s'ils changent là-bas.
 * Janvier 2027 : cartes cadeaux vendues directement sur le site (Stripe), utilisables à la réservation en ligne.
 */

export const giftPaths: Record<Lang, string> = { fr: '/cartes-cadeaux', en: '/en/gift-vouchers' }

const shop = (path: string) => `${GIFT_URL.replace(/\/$/, '')}/${path}`

export interface GiftOffer {
  id: string
  /** Photo (fichier dans public/images, sans extension). */
  image: string
  /** Prix en euros (prix d'appel pour le montant libre). */
  price: number
  /** « dès » devant le prix (montant libre). */
  from?: boolean
  url: string
  text: Record<Lang, { title: string; facts: string; includes: string; alt: string }>
}

/** Cartes cadeaux à valeur : à utiliser pour une nuit, un soin ou un séjour. */
export const vouchers: GiftOffer[] = [
  {
    id: 'carte-100',
    image: 'domaine-facade',
    price: 100,
    url: shop('cheques-cadeaux/cheque-cadeau-de-100-euros.html'),
    text: {
      fr: { title: 'Carte cadeau 100 €', facts: 'Suites et spa', includes: 'À valoir sur une nuit, un soin ou un séjour, en une seule fois.', alt: 'La façade du château et son jardin' },
      en: { title: '€100 gift voucher', facts: 'Suites and spa', includes: 'Use it for a night, a treatment or a stay, in a single visit.', alt: 'The château façade and its garden' },
    },
  },
  {
    id: 'carte-libre',
    image: 'salle-a-manger',
    price: 50,
    from: true,
    url: shop('cheques-cadeaux/cheque-cadeau-a-montant-libre.html'),
    text: {
      fr: { title: 'Montant libre', facts: 'Suites et spa', includes: 'Vous choisissez la somme, ils choisissent leur moment au château.', alt: 'La salle à manger du château, sa grande table et sa cheminée' },
      en: { title: 'Any amount', facts: 'Suites and spa', includes: 'You choose the amount, they choose their moment at the château.', alt: 'The château dining room with its long table and fireplace' },
    },
  },
]

/** Séjours à offrir, pour deux. */
export const stays: GiftOffer[] = [
  {
    id: 'parenthese-romantique',
    image: 'suite-bain',
    price: 755,
    url: shop('sejour/parenthese-romantique.html'),
    text: {
      fr: { title: 'Parenthèse romantique', facts: 'Pour deux · 1 nuit', includes: 'Une suite avec bain à remous ou sauna privé, les petits-déjeuners, gommage, enveloppement et une heure de massage en duo, l’accès au spa.', alt: 'Un bain à remous éclairé à la bougie dans une suite' },
      en: { title: 'Romantic interlude', facts: 'For two · 1 night', includes: 'A suite with a whirlpool bath or private sauna, breakfasts, a scrub, a wrap and a one-hour duo massage, spa access.', alt: 'A candlelit whirlpool bath in a suite' },
    },
  },
  {
    id: 'cure-detox',
    image: 'domaine-vignes-aube',
    price: 686,
    from: true,
    url: shop('cures/cure-detox-au-spa-terrehappy-lussac-saint-emilion.html'),
    text: {
      fr: { title: 'Cure détox', facts: '2 jours · 2 nuits', includes: 'Une suite avec sauna ou bain à remous, les petits-déjeuners, gommage et bain aux minéraux de la mer Morte, un soin et un massage d’une heure, l’accès au spa.', alt: 'Les vignes du domaine à l’aube' },
      en: { title: 'Detox retreat', facts: '2 days · 2 nights', includes: 'A suite with a sauna or whirlpool bath, breakfasts, a Dead Sea mineral scrub and bath, a one-hour treatment and a one-hour massage, spa access.', alt: 'The estate vineyards at dawn' },
    },
  },
  {
    id: 'decouverte-evasion',
    image: 'spa-hammam',
    price: 440,
    url: shop('sejour/decouverte-evasion.html'),
    text: {
      fr: { title: 'Découverte évasion', facts: 'Pour deux · 1 nuit', includes: 'Une nuit avec petits-déjeuners, un soin de 45 minutes chacun, le hammam au savon noir, l’accès au spa.', alt: 'Le hammam du spa' },
      en: { title: 'Escape discovery', facts: 'For two · 1 night', includes: 'One night with breakfasts, a 45-minute treatment each, the hammam with black soap, spa access.', alt: 'The spa hammam' },
    },
  },
  {
    id: 'decouverte-serenite',
    image: 'spa-piscine',
    price: 350,
    url: shop('sejour/decouverte-serenite.html'),
    text: {
      fr: { title: 'Découverte sérénité', facts: 'Pour deux · 1 nuit', includes: 'Une nuit avec petits-déjeuners, un soin de 45 minutes pour l’un des deux, l’accès au spa.', alt: 'Le bassin du spa dans une cour aux murs de pierre' },
      en: { title: 'Serenity discovery', facts: 'For two · 1 night', includes: 'One night with breakfasts, a 45-minute treatment for one of you, spa access.', alt: 'The spa pool in a stone-walled courtyard' },
    },
  },
]

/** Soins du Spa TerreHappy® à offrir. */
export const spaGifts: GiftOffer[] = [
  {
    id: 'je-t-aime',
    image: 'spa-bain',
    price: 120,
    url: shop('spa/je-t-aime.html'),
    text: {
      fr: { title: 'Je t’aime', facts: '1 personne · 1 h', includes: 'Un soin d’une heure au choix : massage californien, tuina, amma assis, ou soin du visage.', alt: 'Le bain à remous du spa' },
      en: { title: 'Je t’aime', facts: '1 person · 1 hour', includes: 'A one-hour treatment of their choice: Californian, tuina or seated amma massage, or a facial.', alt: 'The spa whirlpool bath' },
    },
  },
  {
    id: 'parcours-initiatique',
    image: 'spa-bassin',
    price: 195,
    url: shop('spa/parcours-initiatique-au-spa-terrehappy.html'),
    text: {
      fr: { title: 'Parcours initiatique', facts: '1 personne · 3 h', includes: 'Une heure de soin, un bain aux minéraux de la mer Morte et l’accès au spa : hammam, bol d’air, piscine selon la saison.', alt: 'Le bassin du spa' },
      en: { title: 'Spa discovery journey', facts: '1 person · 3 hours', includes: 'A one-hour treatment, a Dead Sea mineral bath and spa access: hammam, bol d’air, pool depending on the season.', alt: 'The spa pool' },
    },
  },
  {
    id: 'escapade-bien-etre',
    image: 'bain-bougies',
    price: 640,
    url: shop('spa/escapade-bien-etre-en-solo-ou-en-duo.html'),
    text: {
      fr: { title: 'Escapade bien-être', facts: 'Solo ou duo · une demi-journée', includes: 'Gommage et bain de la mer Morte, enveloppement à la boue noire, une heure de soin du corps ou du visage, l’accès au spa.', alt: 'Une grande baignoire creusée dans la pierre, éclairée par un chandelier' },
      en: { title: 'Wellness escape', facts: 'Solo or duo · half a day', includes: 'A Dead Sea scrub and bath, a black mud wrap, a one-hour body or facial treatment, spa access.', alt: 'A large bathtub set into the stone, lit by a candelabra' },
    },
  },
]

export const giftText = {
  fr: {
    seoTitle: 'Cartes cadeaux séjour et spa à Saint-Émilion | Latour Ségur',
    seoDescription: 'Offrez une nuit au château, un week-end en amoureux ou un soin au Spa TerreHappy®, près de Saint-Émilion. Carte cadeau valable un an, reçue par e-mail.',
    eyebrow: 'Cartes cadeaux',
    title: ['Offrir', 'le château.'],
    lead: 'Une nuit au coin du feu, un week-end à deux, une parenthèse au spa. Des cadeaux qui ne se rangent pas dans un placard, valables un an et envoyés par e-mail.',
    coverAlt: 'Le salon Montesquieu décoré pour Noël : sapin, guirlande sur la grande table et bougies allumées devant la cheminée',
    home: 'Accueil',
    vouchersTitle: ['Une carte cadeau,', 'pour tout le château.'],
    vouchersText: 'À valoir sur une nuit dans l’une des cinq suites, un soin ou un séjour. Ils choisissent la date, nous nous occupons du reste.',
    staysTitle: ['Des séjours', 'à offrir.'],
    staysText: 'Le séjour est déjà composé : la suite, les petits-déjeuners et les soins. Il ne reste qu’à choisir la date.',
    spaTitle: ['Le Spa TerreHappy®', 'à offrir.'],
    spaText: 'Une heure ou une demi-journée de soins dans le spa creusé dans la pierre du domaine.',
    from: 'dès',
    give: 'Offrir',
    howTitle: 'Comment ça marche',
    how: [
      { title: 'Vous choisissez', text: 'Paiement sécurisé sur notre boutique de cartes cadeaux, en quelques minutes.' },
      { title: 'Vous l’offrez', text: 'La carte arrive par e-mail, ou vous la retirez au château.' },
      { title: 'Ils réservent', text: 'Par téléphone ou par e-mail avec le numéro de la carte, quand ils le souhaitent dans l’année.' },
    ],
    terms: 'Valable 365 jours à partir de l’achat, selon les disponibilités. Si le séjour coûte plus que la carte, la différence se règle sur place.',
    shopNote: 'Achat sur notre boutique de cartes cadeaux Secretbox, dans une nouvelle fenêtre.',
    allShop: 'Toute la boutique',
    contactTitle: 'Une idée particulière ?',
    contactText: 'Un montant, une suite précise, un séjour sur mesure : appelez-nous, nous composons le cadeau avec vous.',
    bookSelf: 'Et pour vous, réserver une suite',
  },
  en: {
    seoTitle: 'Stay and spa gift vouchers near Saint-Émilion | Latour Ségur',
    seoDescription: 'Give a night at the château, a romantic weekend or a treatment at Spa TerreHappy®, near Saint-Émilion. Gift vouchers valid for a year, sent by email.',
    eyebrow: 'Gift vouchers',
    title: ['Give', 'the château.'],
    lead: 'A night by the fire, a weekend for two, a moment at the spa. Gifts that never end up in a drawer, valid for a year and sent by email.',
    coverAlt: 'The Salon Montesquieu decorated for Christmas: a tree, garland along the long table and lit candles in front of the fireplace',
    home: 'Home',
    vouchersTitle: ['A gift voucher', 'for the whole château.'],
    vouchersText: 'Use it for a night in one of the five suites, a treatment or a stay. They pick the date, we take care of the rest.',
    staysTitle: ['Stays', 'to give.'],
    staysText: 'The stay is already put together: the suite, breakfasts and treatments. All that’s left is to pick a date.',
    spaTitle: ['Spa TerreHappy®', 'to give.'],
    spaText: 'An hour or half a day of treatments in the spa carved into the estate’s stone.',
    from: 'from',
    give: 'Give',
    howTitle: 'How it works',
    how: [
      { title: 'You choose', text: 'Secure payment on our gift voucher shop, in a few minutes.' },
      { title: 'You give it', text: 'The voucher arrives by email, or you collect it at the château.' },
      { title: 'They book', text: 'By phone or email with the voucher number, whenever they like within the year.' },
    ],
    terms: 'Valid for 365 days from purchase, subject to availability. If the stay costs more than the voucher, the difference is paid on site.',
    shopNote: 'Purchase on our Secretbox gift voucher shop, in a new window.',
    allShop: 'The whole shop',
    contactTitle: 'Something particular in mind?',
    contactText: 'An amount, a specific suite, a tailor-made stay: call us and we’ll put the gift together with you.',
    bookSelf: 'Or book a suite for yourself',
  },
}
