import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Seo } from '../components/Seo'
import { SPA_URL, contact, legal } from '../lib/content'
import { LangContext, paths, type Lang, type PageKey } from '../lib/i18n'

function LegalLayout({ lang, page, title, description, eyebrow, children }: { lang: Lang; page: PageKey; title: ReactNode; description: string; eyebrow: string; children: ReactNode }) {
  const other: Lang = lang === 'fr' ? 'en' : 'fr'
  return (
    <LangContext.Provider value={lang}>
      <div className="legal-page">
        <Seo lang={lang} page={page} title={`${eyebrow} — Château Latour Ségur`} description={description} />
        <header>
          <Link to={paths.home[lang]} aria-label={lang === 'fr' ? 'Château Latour Ségur, retour à l’accueil' : 'Château Latour Ségur, back to home'}><Brand /></Link>
          <Link className="legal-lang" to={paths[page][other]} hrefLang={other} lang={other}>{lang === 'fr' ? 'English' : 'Français'}</Link>
        </header>
        <main className="page-width legal-content">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {children}
          <p><Link to={paths.home[lang]}>{lang === 'fr' ? '← Retour au site' : '← Back to the website'}</Link></p>
        </main>
      </div>
    </LangContext.Provider>
  )
}

export function MentionsLegales() {
  return (
    <LegalLayout lang="fr" page="legal" eyebrow="Mentions légales" title={<>Mentions <em>légales.</em></>} description="Mentions légales du site du Château Latour Ségur, suites, spa TerreHappy® et événements à Saint-Émilion.">
      <h2>Éditeur</h2>
      <p>{legal.company}<br />{contact.address}, {contact.locality}<br />Tél. <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a><br /><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <p>Directrice de la publication : {legal.publisher}</p>
      <h2>Conception et hébergement</h2>
      <p>Site conçu et réalisé par {legal.designer}.<br />Hébergement : {legal.host}.</p>
      <h2>Droit applicable et droit d’auteur</h2>
      <p>Le site est soumis au droit français. L’ensemble de son contenu est la propriété de {legal.company} ou de ses affiliés et bénéficie de la protection du droit d’auteur.</p>
      <h2>Droits de propriété intellectuelle</h2>
      <p>{legal.company} est seul propriétaire des éléments du site : marques, logos, photographies, images, illustrations, textes, clips vidéo. Toute reproduction, même partielle, nécessite une autorisation écrite préalable ; toute utilisation non autorisée constitue une contrefaçon sanctionnée pénalement. Les photographies du spa proviennent du site du <a href={SPA_URL}>Spa TerreHappy®</a> ; certaines photographies d’ambiance (réceptions) proviennent d’Unsplash et ne sont pas contractuelles.</p>
      <h2>Données nominatives</h2>
      <p>Conformément à la loi relative à la protection des données, vous disposez d’un droit d’accès, de rectification et de suppression de vos données personnelles. Pour l’exercer, contactez-nous à l’adresse ci-dessus : <a href={`mailto:${contact.email}`}>{contact.email}</a>. Voir aussi notre <Link to={paths.privacy.fr}>politique de confidentialité</Link>.</p>
      <h2>Politique de cookies</h2>
      <p>Ce site n’utilise aucun cookie publicitaire. Pour améliorer votre expérience, sa fréquentation est mesurée avec Rybbit, un outil anonyme qui fonctionne sans cookie. Vous pouvez en outre désactiver les cookies à tout moment dans les paramètres de votre navigateur.</p>
    </LegalLayout>
  )
}

export function Confidentialite() {
  return (
    <LegalLayout lang="fr" page="privacy" eyebrow="Confidentialité" title={<>En toute <em>confiance.</em></>} description="Politique de confidentialité du site du Château Latour Ségur : données collectées via le formulaire et mesure d’audience sans cookie.">
      <h2>Formulaire de demande</h2>
      <p>Lorsque vous préparez votre venue, les informations saisies (nom, e-mail, téléphone facultatif, dates, nombre de personnes, message) sont enregistrées afin que le château puisse vous répondre. Elles ne sont ni vendues ni transmises à des tiers, et conservées au plus 3 ans après notre dernier échange. Base légale : votre demande (mesures précontractuelles).</p>
      <p>Les données sont hébergées par Supabase (infrastructure au sein de l’Union européenne). Vous pouvez demander leur consultation ou leur suppression à tout moment : <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
      <h2>Mesure d’audience</h2>
      <p>Nous utilisons Rybbit, un outil de statistiques respectueux de la vie privée : pas de cookie, pas d’identifiant persistant, pas de profilage.</p>
      <h2>Services externes</h2>
      <p>Les liens vers Instagram, Google Maps et le site du Spa TerreHappy® vous conduisent vers des services tiers soumis à leurs propres politiques.</p>
    </LegalLayout>
  )
}

export function LegalNotice() {
  return (
    <LegalLayout lang="en" page="legal" eyebrow="Legal notice" title={<>Legal <em>notice.</em></>} description="Legal notice for the Château Latour Ségur website: suites, Spa TerreHappy® and events near Saint-Émilion.">
      <h2>Publisher</h2>
      <p>{legal.company}<br />{contact.address}, {contact.locality}, France<br />Tel. <a href={`tel:${contact.phoneLink}`}>{contact.phone}</a><br /><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <p>Publication director: {legal.publisher}</p>
      <h2>Design and hosting</h2>
      <p>Website designed and built by {legal.designer}.<br />Hosting: {legal.host.replace('États-Unis', 'USA')}.</p>
      <h2>Applicable law and copyright</h2>
      <p>This website is governed by French law. All of its content is the property of {legal.company} or its affiliates and is protected by copyright.</p>
      <h2>Intellectual property</h2>
      <p>{legal.company} is the sole owner of the elements of this website: trademarks, logos, photographs, images, illustrations, texts and video clips. Any reproduction, even partial, requires prior written permission; any unauthorised use constitutes an infringement punishable by law. Spa photographs come from the <a href={SPA_URL}>Spa TerreHappy®</a> website; some mood photographs (receptions) come from Unsplash and are not contractual.</p>
      <h2>Personal data</h2>
      <p>In accordance with data protection law, you have the right to access, correct and delete your personal data. To exercise it, contact us at the address above: <a href={`mailto:${contact.email}`}>{contact.email}</a>. See also our <Link to={paths.privacy.en}>privacy policy</Link>.</p>
      <h2>Cookie policy</h2>
      <p>This website uses no advertising cookies. To improve your experience, traffic is measured with Rybbit, an anonymous tool that works without cookies. You can also disable cookies at any time in your browser settings.</p>
    </LegalLayout>
  )
}

export function Privacy() {
  return (
    <LegalLayout lang="en" page="privacy" eyebrow="Privacy" title={<>In complete <em>confidence.</em></>} description="Privacy policy for the Château Latour Ségur website: data collected through the request form and cookie-free audience measurement.">
      <h2>Request form</h2>
      <p>When you plan your visit, the information you enter (name, email, optional phone number, dates, number of guests, message) is stored so that the château can reply to you. It is never sold or passed on to third parties, and is kept for no more than 3 years after our last exchange. Legal basis: your request (pre-contractual measures).</p>
      <p>The data is hosted by Supabase (infrastructure within the European Union). You may ask to see or delete it at any time: <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
      <h2>Audience measurement</h2>
      <p>We use Rybbit, a privacy-friendly analytics tool: no cookies, no persistent identifier, no profiling.</p>
      <h2>External services</h2>
      <p>Links to Instagram, Google Maps and the Spa TerreHappy® website take you to third-party services subject to their own policies.</p>
    </LegalLayout>
  )
}
