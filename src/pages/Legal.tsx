import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Seo } from '../components/Seo'
import { contact, legal } from '../lib/content'

function LegalLayout({ title, path, description, eyebrow, children }: { title: ReactNode; path: string; description: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="legal-page">
      <Seo title={`${eyebrow} — Château Latour Ségur`} description={description} path={path} />
      <header><Link to="/" aria-label="Château Latour Ségur, retour à l’accueil"><Brand /></Link></header>
      <main className="page-width legal-content">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
        <p><Link to="/">← Retour au site</Link></p>
      </main>
    </div>
  )
}

export function MentionsLegales() {
  return (
    <LegalLayout eyebrow="Mentions légales" path="/mentions-legales" title={<>Mentions <em>légales.</em></>} description="Mentions légales du site du Château Latour Ségur, suites, spa TerreHappy® et événements à Saint-Émilion.">
      <h2>Éditeur</h2>
      <p>{legal.company}<br />{contact.address}, {contact.locality}<br />Tél. <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a><br /><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <p>Directrice de la publication : {legal.publisher}</p>
      <h2>Conception et hébergement</h2>
      <p>Site conçu et réalisé par {legal.designer}.<br />Hébergement : {legal.host}.</p>
      <h2>Droit applicable et droit d’auteur</h2>
      <p>Le site est soumis au droit français. L’ensemble de son contenu est la propriété de {legal.company} ou de ses affiliés et bénéficie de la protection du droit d’auteur.</p>
      <h2>Droits de propriété intellectuelle</h2>
      <p>{legal.company} est seul propriétaire des éléments du site : marques, logos, photographies, images, illustrations, textes, clips vidéo. Toute reproduction, même partielle, nécessite une autorisation écrite préalable ; toute utilisation non autorisée constitue une contrefaçon sanctionnée pénalement. Certaines photographies d’ambiance proviennent d’Unsplash et ne sont pas contractuelles.</p>
      <h2>Données nominatives</h2>
      <p>Conformément à la loi relative à la protection des données, vous disposez d’un droit d’accès, de rectification et de suppression de vos données personnelles. Pour l’exercer, contactez-nous à l’adresse ci-dessus : <a href={`mailto:${contact.email}`}>{contact.email}</a>. Voir aussi notre <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      <h2>Politique de cookies</h2>
      <p>Ce site n’utilise aucun cookie publicitaire. Pour améliorer votre expérience, sa fréquentation est mesurée avec Rybbit, un outil anonyme qui fonctionne sans cookie. Vous pouvez en outre désactiver les cookies à tout moment dans les paramètres de votre navigateur.</p>
    </LegalLayout>
  )
}

export function Confidentialite() {
  return (
    <LegalLayout eyebrow="Confidentialité" path="/confidentialite" title={<>En toute <em>confiance.</em></>} description="Politique de confidentialité du site du Château Latour Ségur : données collectées via le formulaire et mesure d’audience sans cookie.">
      <h2>Formulaire de demande</h2>
      <p>Lorsque vous préparez votre venue, les informations saisies (nom, e-mail, téléphone facultatif, dates, nombre de personnes, message) sont enregistrées afin que le château puisse vous répondre. Elles ne sont ni vendues ni transmises à des tiers, et conservées au plus 3 ans après notre dernier échange. Base légale : votre demande (mesures précontractuelles).</p>
      <p>Les données sont hébergées par Supabase (infrastructure au sein de l’Union européenne). Vous pouvez demander leur consultation ou leur suppression à tout moment : <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
      <h2>Mesure d’audience</h2>
      <p>Nous utilisons Rybbit, un outil de statistiques respectueux de la vie privée : pas de cookie, pas d’identifiant persistant, pas de profilage.</p>
      <h2>Services externes</h2>
      <p>Les liens vers Instagram et Google Maps vous conduisent vers des services tiers soumis à leurs propres politiques.</p>
    </LegalLayout>
  )
}
