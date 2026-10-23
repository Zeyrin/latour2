import { createContext, useContext } from 'react'

export type Lang = 'fr' | 'en'

export const LangContext = createContext<Lang>('fr')
export const useLang = () => useContext(LangContext)

/** Chemins de chaque page, par langue (les pages se répondent d'une langue à l'autre). */
export const paths = {
  home: { fr: '/', en: '/en' },
  legal: { fr: '/mentions-legales', en: '/en/legal-notice' },
  privacy: { fr: '/confidentialite', en: '/en/privacy' },
} satisfies Record<string, Record<Lang, string>>

export type PageKey = keyof typeof paths

export const locales: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' }
