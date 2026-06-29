import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confidentialité" };

export default function ConfidentialitePage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl text-navy-800">Politique de confidentialité</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-navy-600">
        <p>
          Alia accorde une grande importance à la protection de tes données. Cette
          page explique quelles données sont collectées, pourquoi, et quels sont tes
          droits (RGPD).
        </p>

        <div>
          <h2 className="font-display text-lg text-navy-800">Responsable de traitement</h2>
          <p className="mt-1">Justine Chandler. <span className="text-navy-400">[Coordonnées à compléter.]</span></p>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Données collectées & finalités</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li><strong>Candidature</strong> : identité, contact, réponses au questionnaire — pour étudier ta demande d'accompagnement.</li>
            <li><strong>Prise de rendez-vous</strong> : identité et contact — pour organiser l'appel découverte.</li>
            <li><strong>Espace cliente</strong> : profil, avancement des piliers, photos — pour réaliser l'accompagnement.</li>
            <li><strong>Photos</strong> : données sensibles, traitées uniquement avec ton consentement explicite, stockées de façon privée.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Base légale</h2>
          <p className="mt-1">Ton <strong>consentement</strong>, recueilli au moment de la candidature, de la réservation et dans ton espace (photos, traitement IA).</p>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Hébergement & destinataires</h2>
          <p className="mt-1">Tes données sont hébergées en <strong>Union européenne</strong> et ne sont accessibles qu'à Justine. Elles ne sont jamais revendues.</p>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Durée de conservation</h2>
          <p className="mt-1">Les données sont conservées le temps de l'accompagnement, puis archivées ou supprimées. Les candidatures et réservations non converties sont purgées après un délai raisonnable.</p>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Tes droits</h2>
          <p className="mt-1">
            Tu disposes d'un droit d'accès, de rectification et d'<strong>effacement</strong> de tes
            données. Sur demande, l'ensemble de tes informations (compte, candidatures,
            réservations, photos) peut être supprimé définitivement.
            {" "}
            <span className="text-navy-400">[Email pour exercer tes droits à compléter.]</span>
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg text-navy-800">Cookies</h2>
          <p className="mt-1">Alia n'utilise qu'un cookie technique de session (connexion) et un jeton anti-CSRF, nécessaires au fonctionnement. Aucun traceur publicitaire.</p>
        </div>
      </div>
    </section>
  );
}
