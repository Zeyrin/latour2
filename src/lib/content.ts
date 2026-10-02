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
  options: { title: string; text: string }[]
}

export const universes: Universe[] = [
  {
    id: 'suites',
    number: '01',
    label: 'Les suites',
    art: 'L’art de séjourner',
    title: ['Les Suites', 'du château'],
    tagline: 'Des nuits douces, des matins à soi.',
    image: 'suites',
    imageAlt: 'Une suite chaleureuse, entre bois naturel, lumière douce et linge délicat',
    heading: ['Se sentir ailleurs.', 'Se sentir chez soi.'],
    description: 'Une porte que l’on pousse, la douceur d’une lumière, le charme des matières. Dans les dépendances du château, nos suites cultivent cet équilibre précieux entre le caractère d’une maison ancienne et le confort d’un refuge intime.',
    detail: 'Inspirées des cinq éléments, elles ont chacune leur personnalité. À vous de trouver celle qui vous ressemble, puis de laisser le temps faire le reste.',
    features: ['Suites de caractère', 'Petits-déjeuners', 'Au calme du parc'],
    action: 'Explorer les suites',
    options: [
      { title: 'La Suite Eau', text: 'Un univers de douceur et de fluidité, pensé pour ralentir à deux et retrouver le plaisir des choses simples.' },
      { title: 'La Suite Feu', text: 'Une atmosphère enveloppante, le charme d’une cheminée et l’esprit chaleureux d’une véritable maison de campagne.' },
      { title: 'Le Cottage Bois', text: 'Les nuances du blé, de la pierre et du bois. Un refuge indépendant pour vivre le domaine à votre rythme.' },
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
    description: 'L’eau, la chaleur, le silence. Au Spa TerreHappy®, tout invite à renouer avec ses sensations. Un cocon à privatiser, où les soins et les gestes attentifs ouvrent une parenthèse rien qu’à vous, loin de l’agitation du quotidien.',
    detail: 'Pour quelques heures, une journée ou une soirée, venez seul, à deux ou entre amis. Nous composons avec vous votre moment de bien-être.',
    features: ['Spa privatisable', 'Soins personnalisés', 'À votre rythme'],
    action: 'Découvrir le spa',
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
    image: 'evenements',
    imageAlt: 'Une grande table de réception fleurie, dressée avec simplicité et élégance',
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
]

export const escapes = [
  { id: 'romantique', label: 'Une escapade à deux', title: 'À deux, loin du monde.', image: 'suite-candidate', alt: 'Un grand lit baigné de lumière dans une chambre aux tons naturels', text: 'Un réveil sans réveil, une balade dans le parc, une pause au spa. Retrouvez le plaisir d’être simplement ensemble.', universe: 'suites' as UniverseId, request: 'Je souhaite en savoir plus sur un week-end romantique au château.' },
  { id: 'ressourcement', label: 'Cures & bien-être', title: 'Retrouver son équilibre.', image: 'spa-soin', alt: 'Un soin relaxant aux huiles, réalisé avec des gestes attentionnés', text: 'Accorder au corps et à l’esprit le temps dont ils ont besoin. Une parenthèse de soins à composer selon vos envies.', universe: 'spa' as UniverseId, request: 'Je souhaite composer une cure de bien-être et de ressourcement.' },
  { id: 'partage', label: 'Des moments à partager', title: 'Le bonheur d’être réunis.', image: 'art-de-vivre', alt: 'Des verres de vin prêts à être partagés autour d’une belle table', text: 'Une grande tablée, des conversations qui s’étirent et des liens qui se renforcent. Les plus beaux souvenirs se vivent à plusieurs.', universe: 'evenements' as UniverseId, request: 'Je souhaite organiser une escapade de groupe ou une réception au château.' },
]

export type GalleryFilter = 'tous' | UniverseId
export const galleryPhotos = [
  { id: 'suite-lumiere', category: 'suites' as UniverseId, image: 'suites', title: 'La douceur d’un refuge', alt: 'Un intérieur de suite habillé de bois et de lumière chaude' },
  { id: 'spa-eau', category: 'spa' as UniverseId, image: 'spa-piscine', title: 'L’heure suspendue', alt: 'L’eau du bassin et les lumières du spa à la nuit tombante' },
  { id: 'table', category: 'evenements' as UniverseId, image: 'evenements', title: 'Le goût d’être ensemble', alt: 'Une table de réception ornée de fleurs et de feuillage' },
  { id: 'suite-matin', category: 'suites' as UniverseId, image: 'suite-candidate', title: 'Les matins tranquilles', alt: 'Lumière du matin dans une chambre aux nuances de sable' },
  { id: 'spa-soin', category: 'spa' as UniverseId, image: 'spa-soin', title: 'Un retour à l’essentiel', alt: 'Un massage aux huiles, pour une pause de bien-être' },
  { id: 'partage-vin', category: 'evenements' as UniverseId, image: 'art-de-vivre', title: 'L’art de recevoir', alt: 'Verres de vin et moments de convivialité' },
]

export const contact = {
  phone: '+33 (0)5 57 51 06 72',
  phoneLink: '+33557510672',
  email: 'contact@chateaulatoursegur.com',
  address: '1, lieu-dit Latour',
  locality: '33570 Lussac — Saint-Émilion',
  map: 'https://www.google.com/maps/search/?api=1&query=Ch%C3%A2teau+Latour+S%C3%A9gur+1+Latour+33570+Lussac',
}
