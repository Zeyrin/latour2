import { useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'

/** Formulaire de paiement Stripe intégré à la page (chargé uniquement au moment de payer). */
export default function StripeCheckout({ clientSecret, publishableKey, onComplete }: { clientSecret: string; publishableKey: string; onComplete: () => void }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  return <div className="stripe-checkout">
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  </div>
}
