interface PictureProps {
  name: string
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
}

/** Dimensions réelles des grandes images de public/images (largeur, hauteur) : width/height évitent les décalages de mise en page. */
const imageSizes: Record<string, [number, number]> = {
  'chateau-panorama': [1920, 1280],
  parc: [800, 800],
  'spa-piscine': [1012, 884],
  'spa-bain': [1400, 700],
  'spa-bassin': [1400, 700],
  'spa-hammam': [1400, 933],
  'spa-nuit': [1400, 864],
}
const DEFAULT_SIZE: [number, number] = [1600, 1067]

export function Picture({ name, alt, className = '', priority = false, sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 45vw' }: PictureProps) {
  const [width, height] = imageSizes[name] ?? DEFAULT_SIZE
  return <img
    className={className}
    src={`/images/${name}.webp`}
    srcSet={`/images/${name}-small.webp 640w, /images/${name}.webp ${width}w`}
    sizes={sizes}
    width={width}
    height={height}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : 'auto'}
    decoding={priority ? 'sync' : 'async'}
  />
}
