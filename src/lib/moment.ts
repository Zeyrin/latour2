import type { Lang } from './i18n'

/**
 * « En ce moment » : petite notification sur l'accueil, qui ouvre une fiche détaillée.
 *
 * Pour la mettre à jour : modifier les textes ci-dessous (FR et EN).
 * Pour la masquer : passer `enabled` à false, ou laisser `hideAfter` la retirer seule.
 * Pour la reproposer à ceux qui l'ont fermée : changer `id` (ex. 'paques-2027').
 * Pour un événement daté : remplir `date` (texte affiché) ; laisser vide affiche « Date à confirmer ».
 *
 * ⚠️ TEXTES PROVISOIRES : les dates, horaires et détails des événements
 * sont à confirmer par Corinne & André avant la mise en ligne (voir les TODO).
 */
export const moment = {
  /** Identifiant de la campagne : la fermeture de la notification est mémorisée par campagne. */
  id: 'noel-2026',
  enabled: true,
  /** Délai d'apparition une fois le haut de page dépassé (ms). */
  delay: 1200,
  /** Après ce jour (inclus), la section disparaît d'elle-même (AAAA-MM-JJ). */
  hideAfter: '2027-01-06',
  /** Photo principale (fichier dans public/images, sans extension). */
  image: 'noel-salle-a-manger',
}

export interface MomentEvent {
  id: string
  label: string
  title: string
  /** Texte de la date, ex. « Samedi 6 et dimanche 7 décembre · 10 h – 18 h ». Vide = à confirmer. */
  date: string
  text: string
  cta: string
  /** Message pré-rempli dans le formulaire de contact. */
  request: string
}

export interface MomentContent {
  eyebrow: string
  /** Petite notification (coin de l'écran). */
  notice: { title: string; line: string; open: string; close: string }
  title: [string, string]
  intro: string
  alt: string
  dateTbc: string
  stayNote: [string, string]
  stayCta: string
  events: MomentEvent[]
}

export const momentContent: Record<Lang, MomentContent> = {
  fr: {
    eyebrow: 'En ce moment',
    notice: { title: 'Noël au château', line: 'Marché de Noël · Portes ouvertes', open: 'Découvrir', close: 'Fermer la notification' },
    title: ['Noël s’installe', 'à Latour Ségur.'],
    intro: 'Les bougies s’allument, le sapin prend place près de la cheminée et la grande table se pare de verdure. Pour les fêtes, le château ouvre ses portes.',
    alt: 'La salle à manger du château décorée pour Noël : sapin, guirlande de sapin sur la grande table et bougies rouges allumées devant la cheminée',
    dateTbc: 'Date à confirmer',
    stayNote: ['Et pourquoi ne pas rester', 'pour la nuit ?'],
    stayCta: 'Réserver une suite',
    events: [
      {
        id: 'marche-noel',
        label: 'Marché de Noël',
        title: 'Le marché de Noël du château',
        date: '', // TODO : date(s) et horaires à confirmer
        // TODO : texte provisoire, à valider (exposants, produits, animations, entrée libre ?)
        text: 'Producteurs et artisans de la région, vins du vignoble et douceurs de saison, au cœur du domaine illuminé. Une belle occasion de trouver des cadeaux qui ont du sens.',
        cta: 'Je souhaite venir',
        request: 'Bonjour, je souhaite venir au marché de Noël du château. Pouvez-vous me donner les informations pratiques ?',
      },
      {
        id: 'portes-ouvertes',
        label: 'Portes ouvertes',
        title: 'Portes ouvertes de novembre & décembre',
        date: '', // TODO : date(s) et horaires à confirmer
        // TODO : texte provisoire, à valider (visite des suites ? du spa ? dégustation ?)
        text: 'Venez découvrir la maison : les suites, le spa et les salons décorés pour les fêtes. Corinne et André vous accueillent pour une visite et un moment d’échange.',
        cta: 'Prévenir de ma visite',
        request: 'Bonjour, je souhaite venir aux portes ouvertes du château. Pouvez-vous me donner les informations pratiques ?',
      },
    ],
  },
  en: {
    eyebrow: 'Happening now',
    notice: { title: 'Christmas at the château', line: 'Christmas market · Open days', open: 'Discover', close: 'Dismiss notification' },
    title: ['Christmas comes', 'to Latour Ségur.'],
    intro: 'Candles are lit, the tree takes its place by the fireplace and the long table is dressed in greenery. For the festive season, the château opens its doors.',
    alt: 'The château dining room decorated for Christmas: a tree, fir garland along the long table and lit red candles in front of the fireplace',
    dateTbc: 'Date to be confirmed',
    stayNote: ['Why not stay', 'for the night?'],
    stayCta: 'Book a suite',
    events: [
      {
        id: 'marche-noel',
        label: 'Christmas market',
        title: 'The château Christmas market',
        date: '', // TODO: date(s) and times to be confirmed
        text: 'Local producers and craftspeople, wines from the vineyards and seasonal treats, at the heart of the illuminated estate. A lovely way to find gifts that mean something.',
        cta: 'I’d like to come',
        request: 'Hello, I would like to come to the château Christmas market. Could you send me the practical details?',
      },
      {
        id: 'portes-ouvertes',
        label: 'Open days',
        title: 'November & December open days',
        date: '', // TODO: date(s) and times to be confirmed
        text: 'Come and discover the house: the suites, the spa and the lounges dressed for the holidays. Corinne and André welcome you for a visit and a chat.',
        cta: 'Let us know you’re coming',
        request: 'Hello, I would like to come to the château open days. Could you send me the practical details?',
      },
    ],
  },
}

/** Vrai tant que la section doit s'afficher à la date donnée. */
export function isMomentVisible(now: Date = new Date()) {
  if (!moment.enabled) return false
  return now.toISOString().slice(0, 10) < moment.hideAfter
}
