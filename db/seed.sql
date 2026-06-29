-- =====================================================================
-- seed.sql — jeu de démonstration cohérent (1 coach + 1 cliente).
-- ---------------------------------------------------------------------
-- ATTENTION : DESTRUCTIF. Vide toutes les données applicatives puis
-- recharge une démo. À n'exécuter que sur une base de DÉMONSTRATION.
--
-- Le parcours est rejoué via les fonctions métier (submit_pilier /
-- validate_pilier) : charger ce seed sans erreur prouve que le gate de
-- validation et l'avancement des piliers fonctionnent (test d'intégration).
--
-- État final de la démo :
--   Pilier 1 (Identité)       -> validated   (3 mots renseignés + moodboard)
--   Pilier 2 (Mise en valeur) -> validated   (needs_revision puis validated : 2 lignes d'historique)
--   Pilier 3 (Tri)            -> validated   (pièces gardées / sorties)
--   Pilier 4 (Construction)   -> submitted   (EN ATTENTE -> visible dans pending_validations)
-- =====================================================================

-- Purge (rejouable). TRUNCATE ... CASCADE depuis users efface tout le
-- contenu applicatif ; availability_slots couvre le module RDV (et, par
-- cascade, discovery_bookings) ; applications couvre le module
-- candidatures. schema_migrations (sans FK) n'est pas touchée.
TRUNCATE TABLE users, availability_slots, applications CASCADE;

DO $$
DECLARE
  -- Coach : identifiant fixe (créé directement). Cliente : créée via la
  -- fonction métier create_cliente_account -> id récupéré dynamiquement.
  v_coach_id   uuid := '00000000-0000-0000-0000-0000000000c0';
  v_cli_user   uuid;
  v_cliente_id uuid;

  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  v_consent_photos uuid;
  v_asset_color uuid; v_asset_morpho uuid;
  v_asset_piece1 uuid; v_asset_piece2 uuid;
  v_piece_keep1 uuid; v_piece_perso uuid; v_piece_basique uuid; v_piece_dopamine uuid;
  v_look uuid;
  v_moodboard uuid;
  v_msg1 uuid; v_msg2 uuid; v_asset_chat uuid;
BEGIN
  -- ---------------------------------------------------------------
  -- Comptes (hash fictifs ; la base ne stocke JAMAIS de clair).
  -- ---------------------------------------------------------------
  -- Coach (admin) : compte créé directement.
  INSERT INTO users (id, role, email, password_hash)
  VALUES (v_coach_id, 'coach', 'justine@image-coaching.test',
          '$2b$12$DEMODEMODEMODEMODEMOdeuJ0kY0c0aChH3qg7m2Yb9xV2wQ1Sa');

  -- Cliente démo créée via la fonction métier :
  --   * must_change_password = true (mot de passe initial temporaire),
  --   * déclenche l'auto-création des 4 piliers.
  v_cliente_id := create_cliente_account(
    'lea.martin@example.test',
    '$2b$12$DEMODEMODEMODEMODEMOdeuL3aMa2rt1nC1iEnt3xxxxxxxxxxxx',
    'Léa', 'Martin', DATE '1992-02-20', 'Lyon', 'Reprise professionnelle après un congé parental');
  SELECT user_id INTO v_cli_user FROM clientes WHERE id = v_cliente_id;

  -- Léa est déjà bien avancée -> on règle son statut d'accompagnement.
  UPDATE clientes
     SET status = 'in_progress', accompaniment_start_date = DATE '2026-01-15'
   WHERE id = v_cliente_id;

  SELECT id INTO v_p1 FROM piliers WHERE cliente_id = v_cliente_id AND numero = 1;
  SELECT id INTO v_p2 FROM piliers WHERE cliente_id = v_cliente_id AND numero = 2;
  SELECT id INTO v_p3 FROM piliers WHERE cliente_id = v_cliente_id AND numero = 3;
  SELECT id INTO v_p4 FROM piliers WHERE cliente_id = v_cliente_id AND numero = 4;

  -- ---------------------------------------------------------------
  -- Consentements RGPD
  -- ---------------------------------------------------------------
  INSERT INTO consents (cliente_id, scope, granted, granted_at) VALUES
    (v_cliente_id, 'photos',             true, now()),
    (v_cliente_id, 'traitement_donnees', true, now());
  SELECT id INTO v_consent_photos
    FROM consents WHERE cliente_id = v_cliente_id AND scope = 'photos';

  -- ===============================================================
  -- PILIER 1 — Identité : les 3 mots-boussole
  -- ===============================================================
  UPDATE clientes
     SET word_who_she_is     = 'Authentique',
         word_what_she_likes = 'Lumineuse',
         word_to_embody      = 'Affirmée'
   WHERE id = v_cliente_id;

  INSERT INTO moodboards (cliente_id, pilier_id, title)
  VALUES (v_cliente_id, v_p1, 'Inspiration — Lumineuse')
  RETURNING id INTO v_moodboard;

  INSERT INTO moodboard_items (moodboard_id, source_url, note) VALUES
    (v_moodboard, 'https://www.pinterest.com/pin/demo-lumiere',  'Palettes claires, matières fluides'),
    (v_moodboard, 'https://unsplash.com/photos/demo-soleil-dore', 'Lumière naturelle dorée');

  PERFORM submit_pilier(v_p1);
  PERFORM validate_pilier(v_p1, v_coach_id, 'validated',
                          'Les 3 mots sont justes et cohérents. On avance.');

  -- ===============================================================
  -- PILIER 2 — Mise en valeur : colorimétrie + morphologie
  -- ===============================================================
  INSERT INTO assets (cliente_id, pilier_id, consent_id, type, storage_url, storage_provider)
  VALUES (v_cliente_id, v_p2, v_consent_photos, 'colorimetrie',
          'https://storage.image-coaching.test/lea/colorimetrie.jpg', 'supabase')
  RETURNING id INTO v_asset_color;

  INSERT INTO assets (cliente_id, pilier_id, consent_id, type, storage_url, storage_provider)
  VALUES (v_cliente_id, v_p2, v_consent_photos, 'morphologie',
          'https://storage.image-coaching.test/lea/morphologie.jpg', 'supabase')
  RETURNING id INTO v_asset_morpho;

  INSERT INTO color_profiles (cliente_id, season, palette, makeup_reco, hair_reco)
  VALUES (v_cliente_id, 'Printemps clair',
          '{"dominantes":["corail","pêche","ivoire","turquoise clair"],"a_eviter":["noir","bordeaux"]}'::jsonb,
          'Tons pêche et corail ; éviter les fards trop froids.',
          'Reflets dorés ; éviter le cendré.');

  INSERT INTO morpho_profiles (cliente_id, type, measurements, reco)
  VALUES (v_cliente_id, 'X',
          '{"epaules_cm":96,"taille_cm":70,"hanches_cm":98}'::jsonb,
          '{"valoriser":["cintrer la taille","encolures en V"],"eviter":["coupes droites oversize"]}'::jsonb);

  -- Aller-retour needs_revision -> re-soumission -> validated (historique riche)
  PERFORM submit_pilier(v_p2);
  PERFORM validate_pilier(v_p2, v_coach_id, 'needs_revision',
                          'Ajouter 2 photos en lumière naturelle pour confirmer la saison.');
  PERFORM submit_pilier(v_p2);
  PERFORM validate_pilier(v_p2, v_coach_id, 'validated',
                          'Saison confirmée : Printemps clair. Parfait.');

  -- ===============================================================
  -- PILIER 3 — Tri du dressing (garder / sortir + critères)
  -- ===============================================================
  INSERT INTO assets (cliente_id, pilier_id, consent_id, type, storage_url)
  VALUES (v_cliente_id, v_p3, v_consent_photos, 'piece_photo',
          'https://storage.image-coaching.test/lea/blazer-ecru.jpg')
  RETURNING id INTO v_asset_piece1;

  INSERT INTO assets (cliente_id, pilier_id, consent_id, type, storage_url)
  VALUES (v_cliente_id, v_p3, v_consent_photos, 'piece_photo',
          'https://storage.image-coaching.test/lea/jean-noir.jpg')
  RETURNING id INTO v_asset_piece2;

  INSERT INTO pieces (cliente_id, asset_id, name, tri_decision, linked_word, tags)
  VALUES (v_cliente_id, v_asset_piece1, 'Blazer écru', 'garder', 'to_embody', ARRAY['veste','bureau'])
  RETURNING id INTO v_piece_keep1;

  INSERT INTO pieces (cliente_id, name, tri_decision, linked_word, tags)
  VALUES (v_cliente_id, 'Chemisier corail', 'garder', 'what_she_likes', ARRAY['haut','couleur']);

  INSERT INTO pieces (cliente_id, asset_id, name, tri_decision, tri_criterion, tags)
  VALUES (v_cliente_id, v_asset_piece2, 'Jean noir délavé', 'sortir', 'plus_aligne', ARRAY['jean']);

  PERFORM submit_pilier(v_p3);
  PERFORM validate_pilier(v_p3, v_coach_id, 'validated',
                          'Tri cohérent avec les 3 mots. Bravo.');

  -- ===============================================================
  -- PILIER 4 — Construction : basiques / personnalité / dopamines + look
  -- ===============================================================
  INSERT INTO pieces (cliente_id, name, wardrobe_category, linked_word, tags)
  VALUES (v_cliente_id, 'T-shirt blanc coton bio', 'basique', 'who_she_is', ARRAY['basique','haut'])
  RETURNING id INTO v_piece_basique;

  INSERT INTO pieces (cliente_id, name, wardrobe_category, linked_word, tags)
  VALUES (v_cliente_id, 'Blazer corail cintré', 'personnalite', 'to_embody', ARRAY['veste','signature'])
  RETURNING id INTO v_piece_perso;

  INSERT INTO pieces (cliente_id, name, wardrobe_category, linked_word, tags)
  VALUES (v_cliente_id, 'Foulard imprimé turquoise', 'dopamine', 'what_she_likes', ARRAY['accessoire'])
  RETURNING id INTO v_piece_dopamine;

  INSERT INTO looks (cliente_id, name, category, annotation)
  VALUES (v_cliente_id, 'Look bureau lumineux', 'personnalite',
          'Blazer corail + t-shirt blanc + foulard turquoise.')
  RETURNING id INTO v_look;

  INSERT INTO look_pieces (look_id, piece_id) VALUES
    (v_look, v_piece_basique),
    (v_look, v_piece_perso),
    (v_look, v_piece_dopamine);

  -- Pilier 4 soumis et EN ATTENTE de validation -> alimente pending_validations
  PERFORM submit_pilier(v_p4);

  -- ---------------------------------------------------------------
  -- Notifications (côté application ; ici simulées)
  -- ---------------------------------------------------------------
  -- Notifications NOMINATIVES reçues par la COACH (recipient = coach) :
  -- elles portent payload.cliente_id -> purgées par forget_person (RGPD).
  INSERT INTO notifications (recipient_id, type, payload) VALUES
    (v_coach_id, 'pilier_submitted',
       jsonb_build_object('cliente_id', v_cliente_id, 'pilier', 4, 'cliente', 'Léa Martin')),
    (v_coach_id, 'pilier_validated',
       jsonb_build_object('cliente_id', v_cliente_id, 'pilier', 3, 'cliente', 'Léa Martin')),
    (v_cli_user, 'pilier_validated',
       jsonb_build_object('pilier', 3, 'message', 'Ton pilier Tri est validé !'));

  -- ---------------------------------------------------------------
  -- Messagerie (table 006, enrichie en 010) — échange démo
  --   msg 1 : coach -> cliente, remis ET LU (read_at renseigné)
  --   msg 2 : cliente -> coach, remis mais NON LU, avec PIÈCE JOINTE (photo)
  -- ---------------------------------------------------------------
  INSERT INTO messages (cliente_id, sender_role, sender_id, body, delivered_at, read_at)
  VALUES (v_cliente_id, 'coach', v_coach_id,
          'Bravo Léa, ton tri est top. On attaque la construction !',
          now() - interval '2 hours', now() - interval '90 minutes')
  RETURNING id INTO v_msg1;

  -- Photo envoyée dans le chat (réutilise assets -> consentement + EU).
  INSERT INTO assets (cliente_id, type, storage_url, consent_id)
  VALUES (v_cliente_id, 'other',
          'https://storage.image-coaching.test/lea/chat-haut-corail.jpg', v_consent_photos)
  RETURNING id INTO v_asset_chat;

  INSERT INTO messages (cliente_id, sender_role, sender_id, body, delivered_at)
  VALUES (v_cliente_id, 'cliente', v_cli_user,
          'Est-ce que ce haut me va avec ma colorimétrie ?',
          now() - interval '25 minutes')
  RETURNING id INTO v_msg2;

  INSERT INTO message_attachments (message_id, asset_id) VALUES (v_msg2, v_asset_chat);

END $$;

-- =====================================================================
-- 2e CLIENTE DÉMO — illustre l'état « a déjà changé son mot de passe »
-- =====================================================================
DO $$
DECLARE
  v_cid uuid;
  v_uid uuid;
BEGIN
  -- Création par l'admin -> must_change_password = true (temporaire).
  v_cid := create_cliente_account(
    'manon.petit@example.test',
    '$2b$12$DEMODEMODEMODEMODEMOdeuManonInitialTempxxxxxxxxxxx',
    'Manon', 'Petit', DATE '1996-07-15', 'Nantes', NULL);
  SELECT user_id INTO v_uid FROM clientes WHERE id = v_cid;

  -- La cliente change elle-même son mot de passe -> false + horodatage.
  PERFORM change_own_password(v_uid,
    '$2b$12$DEMODEMODEMODEMODEMOdeuManonChosenPwHashxxxxxxxxxx');
END $$;

-- =====================================================================
-- MODULE PRISE DE RDV — créneaux de démo + 1 réservation de prospect
-- =====================================================================
-- Créneaux datés relativement à now() pour rester « à venir » (sauf le
-- dernier, passé, qui doit être MASQUÉ par la vue publique).
INSERT INTO availability_slots (id, start_at, end_at, status, admin_note) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   date_trunc('day', now()) + interval '2 days' + interval '10 hours',
   date_trunc('day', now()) + interval '2 days' + interval '10 hours 45 minutes',
   'available', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000002',
   date_trunc('day', now()) + interval '2 days' + interval '11 hours',
   date_trunc('day', now()) + interval '2 days' + interval '11 hours 45 minutes',
   'available', NULL),
  ('aaaaaaaa-0000-0000-0000-000000000003',
   date_trunc('day', now()) + interval '3 days' + interval '14 hours',
   date_trunc('day', now()) + interval '3 days' + interval '14 hours 45 minutes',
   'available', 'Créneau qui sera réservé par la démo'),
  ('aaaaaaaa-0000-0000-0000-000000000004',
   date_trunc('day', now()) + interval '4 days' + interval '9 hours',
   date_trunc('day', now()) + interval '4 days' + interval '9 hours 45 minutes',
   'blocked', 'Fermé par Justine (indisponible)'),
  ('aaaaaaaa-0000-0000-0000-000000000005',
   date_trunc('day', now()) - interval '5 days' + interval '10 hours',
   date_trunc('day', now()) - interval '5 days' + interval '10 hours 45 minutes',
   'available', 'Créneau passé : doit être masqué par public_availability');

-- Réservation de démo via la fonction atomique (passe le créneau à booked).
DO $$
BEGIN
  PERFORM book_slot(
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Camille', 'Durand', 'camille.durand@example.test',
    '+33 6 11 22 33 44',
    'Je souhaite clarifier mon image professionnelle avant une reconversion.',
    now()
  );
END $$;

-- =====================================================================
-- MODULE CANDIDATURES — 3 candidatures de démo à différents statuts
-- =====================================================================
-- App 1 : nouvelle (à trier).  App 2 : sélectionnée.
-- App 3 : convertie, reliée à la cliente démo Léa Martin (funnel complet).
INSERT INTO applications (
  id, full_name, instagram, email, birth_date, profession,
  motivation, current_image, goal, words_today, words_to_embody,
  main_blocker, why_now, commitment_level,
  status, consent_at, admin_notes, converted_cliente_id
) VALUES
  ('99999999-0000-0000-0000-000000000001',
   'Sophie Bernard', '@sophie.bernard', 'sophie.bernard@example.test', DATE '1990-04-12', 'Avocate',
   'Je ne me reconnais plus dans mon dressing depuis ma prise de poste.',
   'Brouillonne, je m''habille par défaut.',
   'Me sentir légitime et alignée en rendez-vous client.',
   'Rigoureuse, discrète, fatiguée',
   'Affirmée, élégante, sereine',
   'La peur de trop en faire et d''être jugée.',
   'Je viens d''être nommée associée, le timing est maintenant.',
   'Très prête, je bloque déjà du temps chaque semaine.',
   'new', now() - interval '2 days', NULL, NULL),

  ('99999999-0000-0000-0000-000000000002',
   'Inès Morel', '@ines.morel', 'ines.morel@example.test', DATE '1986-11-03', 'Cheffe de projet',
   'Envie de tourner une page après une période difficile.',
   'Pratique mais sans personnalité.',
   'Oser la couleur et assumer qui je suis.',
   'Organisée, fiable, en retrait',
   'Rayonnante, créative, libre',
   'Le manque de temps et la culpabilité de penser à moi.',
   'Mes enfants ont grandi, c''est mon tour.',
   'Prête, à condition d''être guidée pas à pas.',
   'selected', now() - interval '5 days', 'Très bon profil, à appeler en priorité.', NULL),

  ('99999999-0000-0000-0000-000000000003',
   'Léa Martin', '@lea.martin', 'lea.martin@example.test', DATE '1992-02-20', 'Responsable marketing',
   'Reprise pro après congé parental, besoin de retrouver confiance.',
   'En transition, je ne sais plus quoi porter.',
   'Incarner la femme affirmée que je suis devenue.',
   'Authentique, créative, hésitante',
   'Authentique, lumineuse, affirmée',
   'Le décalage entre mon dressing et la femme que je suis devenue.',
   'Je reprends le travail dans un mois.',
   'Totalement engagée.',
   'converted', now() - interval '20 days', 'Convertie : accompagnement en cours.',
   (SELECT c.id FROM clientes c JOIN users u ON u.id = c.user_id
     WHERE u.email = 'lea.martin@example.test'));

-- Aperçu rapide après chargement.
\echo ''
\echo '--- pending_validations (file d''attente coach) ---'
SELECT pilier_id, last_name, numero, submitted_at FROM pending_validations;

\echo ''
\echo '--- public_availability (vue publique : aucun nom ; créneau réservé/fermé = is_available false) ---'
SELECT start_at, end_at, is_available FROM public_availability ORDER BY start_at;

\echo ''
\echo '--- applications (liste de triage admin) ---'
SELECT status, full_name, email, created_at::date AS soumis_le FROM applications ORDER BY status, created_at DESC;

\echo ''
\echo '--- messagerie : fil de Léa (lu/non-lu + pièces jointes) ---'
SELECT m.sender_role,
       left(m.body, 42) AS apercu,
       (m.read_at IS NOT NULL) AS lu,
       count(ma.asset_id) AS pieces_jointes
FROM messages m
LEFT JOIN message_attachments ma ON ma.message_id = m.id
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.sender_role, m.body, m.read_at, m.created_at
ORDER BY m.created_at;

\echo ''
\echo '--- comptes : état du mot de passe (jamais de hash affiché) ---'
SELECT u.role, u.email,
       u.must_change_password AS doit_changer,
       (u.password_changed_at IS NOT NULL) AS deja_change
FROM users u ORDER BY u.role, u.email;
