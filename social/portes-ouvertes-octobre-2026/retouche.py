# Retouche automatique : photos plus lumineuses et chaleureuses (style « plein jour » des comptes de référence).
# Usage : python3 social/portes-ouvertes-octobre-2026/retouche.py  (depuis la racine du dépôt)
from PIL import Image, ImageEnhance
from pathlib import Path
import numpy as np

here = Path(__file__).parent
(here / 'photos-retouchees').mkdir(exist_ok=True)
for f in sorted((here / 'photos').glob('*.jpg')):
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255
    lum = a.mean(2)
    lo, hi = np.percentile(lum, 1), np.percentile(lum, 99.3)
    a = np.clip((a - lo) / (hi - lo), 0, 1)                      # niveaux automatiques
    a = a ** np.clip(np.log(0.5) / np.log(max(a.mean(), 1e-3)), 0.6, 1.0)  # éclaircit les tons moyens
    means = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (1 + 0.35 * (means.mean() / means - 1)), 0, 1)  # atténue la dominante jaune
    a[..., 0] *= 1.04; a[..., 2] *= 0.96                          # garde une lumière chaude
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'))
    out = ImageEnhance.Contrast(ImageEnhance.Color(out).enhance(1.12)).enhance(1.05)
    out.save(here / 'photos-retouchees' / f.name, quality=86)
    print('✓', f.name)
