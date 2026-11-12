import { createContext, useContext } from 'react'

export type Lang = 'fr' | 'en'

export const LangContext = createContext<Lang>('fr')
export const useLang = () => useContext(LangContext)

/** Chemins de chaque page, par langue (les pages se répondent d'une langue à l'autre). */
export const paths = {
  home: { fr: '/', en: '/en' },
  legal: { fr: '/mentions-legales', en: '/en/legal-notice' },
  privacy: { fr: '/confidentialite', en: '/en/privacy' },
  // Pages de retour du paiement Stripe (mêmes chemins que RETURN_PATHS dans api/checkout.ts).
  bookingConfirmed: { fr: '/reservation/confirmation', en: '/en/booking/confirmation' },
  bookingCancelled: { fr: '/reservation/annulation', en: '/en/booking/cancelled' },
} satisfies Record<string, Record<Lang, string>>

export type PageKey = keyof typeof paths

/** Chemins de la page détaillée d'une suite. */
export const suitePaths = (suite: string): Record<Lang, string> => ({ fr: `/suites/${suite}`, en: `/en/suites/${suite}` })

export const locales: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' }
