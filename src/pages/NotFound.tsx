import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Seo } from '../components/Seo'
import { suites } from '../lib/content'
import { guidesIndexPaths } from '../lib/guides'
import { LangContext, paths, suitePaths } from '../lib/i18n'

/**
 * Page 404. Pré-rendue en dist/404.html, que Vercel sert avec le statut 404 pour toute adresse inconnue
 * (pas de « soft 404 ») ; marquée noindex. La route « * » l'affiche aussi côté navigateur.
 * Bilingue sur une seule page : on ne sait pas dans quelle langue le visiteur est arrivé.
 */
export function NotFound() {
  return (
    <LangContext.Provider value="fr">
      <div className="legal-page">
        <Seo lang="fr" page={{ fr: '/404', en: '/404' }} title="Page introuvable — Château Latour Ségur" description="Cette page n’existe pas ou a été déplacée." noindex />
        <header>
          <Link to={paths.home.fr} aria-label="Château Latour Ségur Suites & Spa, retour à l’accueil"><Brand /></Link>
        </header>
        <main className="page-width legal-content">
          <p className="eyebrow">Erreur 404</p>
          <h1>Page <em>introuvable.</em></h1>
          <p>Cette page n’existe pas ou a été déplacée. <span lang="en">This page does not exist or has moved.</span></p>
          <h2>Retrouver votre chemin</h2>
          <ul>
            <li><Link to={paths.home.fr}>Chambres d’hôtes & spa près de Saint-Émilion — accueil</Link></li>
            {suites.fr.map((suite) => <li key={suite.id}><Link to={suitePaths(suite.id).fr}>{suite.label}</Link></li>)}
            <li><Link to={guidesIndexPaths.fr}>Guides de Saint-Émilion</Link></li>
            <li lang="en"><Link to={paths.home.en}>English version — B&B with spa near Saint-Émilion</Link></li>
          </ul>
        </main>
      </div>
    </LangContext.Provider>
  )
}
