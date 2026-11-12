interface PictureProps {
  name: string
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
}

const imageWidths: Record<string, number> = {
  domaine: 1600,
  'chateau-panorama': 1920,
  parc: 800,
  'spa-piscine': 1012,
  vignes: 1600,
  'domaine-pigeonnier': 1536,
  'noel-salle-a-manger': 1600,
}

export function Picture({ name, alt, className = '', priority = false, sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 45vw' }: PictureProps) {
  return <img
    className={className}
    src={`/images/${name}.webp`}
    srcSet={`/images/${name}-small.webp 640w, /images/${name}.webp ${imageWidths[name] || (name.startsWith('domaine-') || ['cuvier', 'salle-a-manger', 'cave', 'suite-bain', 'bain-bougies'].includes(name) ? 1600 : 1400)}w`}
    sizes={sizes}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    decoding={priority ? 'sync' : 'async'}
  />
}
