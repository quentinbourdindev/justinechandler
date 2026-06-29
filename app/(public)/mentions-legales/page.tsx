import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl text-navy-800">Mentions légales</h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-navy-600">
        <div>
          <h2 className="font-display text-lg text-navy-800">Éditeur</h2>
          <p className="mt-1">
            Le site Alia est édité par Justine Chandler, coach en image.
            {" "}
            <span className="text-navy-400">[Raison sociale, statut, SIRET et adresse à compléter.]</span>
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-navy-800">Directrice de la publication</h2>
          <p className="mt-1">Justine Chandler.</p>
        </div>
        <div>
          <h2 className="font-display text-lg text-navy-800">Hébergement</h2>
          <p className="mt-1">
            Application et données hébergées en Union européenne.
            {" "}
            <span className="text-navy-400">[Hébergeur et coordonnées à compléter — VPS IONOS / object storage IONOS.]</span>
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-navy-800">Propriété intellectuelle</h2>
          <p className="mt-1">
            L'ensemble des contenus du site (textes, visuels, méthode) est protégé.
            Toute reproduction sans autorisation est interdite.
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg text-navy-800">Contact</h2>
          <p className="mt-1">
            Pour toute question : <span className="text-navy-400">[email de contact à compléter]</span>.
            Voir aussi notre <a href="/confidentialite" className="text-navy-700 underline">politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
