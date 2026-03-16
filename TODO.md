# Roadmap Débats.co

## En cours

- [ ] **Pérenniser le mécanisme d’ajout de contenu depuis Claude** — le script `import:content` atteint ses limites. Réfléchir au meilleur moyen d’alimenter le site efficacement sans tout renvoyer à chaque fois. Un skill qui utilise l’API de production ?

## Prochaines priorités
- [ ] **Page détail prises de position** — route `/p/[slug]/s/[subjectSlug]` pour afficher les prises de position d’une personnalité sur un sujet
- [ ] **Page d’accueil : Limiter le nombre de personnalités actives (thumbnails) sous chaque sujet**
- [ ] **Ajouter un évènement Plausible qu’on on utilise la recherche de personnalité**
- [ ] **Édition du profil utilisateur** — permettre de modifier nom, email, mot de passe depuis `/me` (le dashboard existe déjà)
- [ ] **Arguments (CRUD + liaison aux statements)** — créer, lister, associer des arguments aux prises de position (tables existantes en DB, aucune UI)
- [ ] **CRUD complet personnalités (edit/delete)** — use cases `updatePublicFigure` / `deletePublicFigure` + UI (actuellement Create + Read seulement)
- [ ] **Pagination** — paginer les listes sujets et personnalités (tout est chargé en une fois actuellement)
- [ ] Page détail sujet selon maquette `PAGE SUJET.png`
- [ ] Page d'accueil selon maquette `ACCUEIL.png`

## Idées & souhaits

### Fonctionnalités — priorité moyenne

- [ ] **Optimiser les meta inline (dates, json+ld, …)**
- [ ] **Afficher «une personnnalité au hasard» en haut de la page /p**
- [ ] **Afficher «un sujet au hasard» en haut de la page /s**
- [ ] **Lister Personnalités et sujets sans statements dans la page `Contribuer`** 
- [ ] **Notion d’organisation** - Des organisations peuvent prendre positions sur des sujets
- [ ] **Mettre des logos sur les domaines connus pour les sources**
- [ ] **Masquer les indications dans les formulaires de saisie une fois que l’utilisateur a créé suffisamment de contenu**
- [ ] **Sujet connexes** - Pouvoir indiquer/lier que 2 sujets sont connexes.
- [ ] **Upload fichier pour les preuves** — accepter PDF, images, audio/vidéo en plus des URLs (Supabase Storage)
- [ ] **Upload photo pour les sujets** — exposer le champ `picture_url` dans le formulaire de création/édition
- [ ] **Historique des slugs / redirections** — rediriger les anciens slugs après renommage (301) pour ne pas casser les liens
- [ ] **Notifications flash** — système de messages globaux (succès, info, erreur) après chaque action
- [ ] **Reset mot de passe** — flow "mot de passe oublié" via Supabase Auth (formulaire + email + page de reset)
- [ ] Recherche et filtres sur sujets et personnalités
- [ ] Timeline des positions d'une personnalité sur un sujet (évolution dans le temps)

### Fonctionnalités — priorité basse

- [ ] **Formulaire embarqué page personnalité** — ajouter une prise de position directement depuis `/p/[slug]` avec autocomplete sujet
- [ ] **Emails personnalisés (branding Débats.co)** — templates HTML pour les emails transactionnels Supabase
- [ ] **Inscription libre avec activation par email** — en complément du système d'invitation actuel
- [ ] **Infrastructure i18n** — préparer l'internationalisation (pas bloquant pour un site francophone)
- [ ] Notifications real-time (Supabase Realtime)
- [ ] Système de votes sur les arguments

### Qualité & technique

- [ ] Tests e2e avec Playwright
- [ ] SEO et meta tags OpenGraph par page
- [ ] Accessibilité (audit WCAG)

## Contenu à ajouter

- [ ] Alimenter les sujets présidentielle 2022 (plan dans memory)
- [ ] **Sujet Gaza** — ajouter le sujet sur la guerre à Gaza (intitulé exact à préciser) avec positions et personnalités
- [ ] **Import nosdeputes.fr** — explorer l'API de nosdeputes.fr pour extraire les prises de position des députés (votes, interventions, propositions de loi) et les mapper sur nos sujets

## Fait

- [x] Issues Sentry — 2 issues analysées (bug Node.js streams + erreur réseau isolée), ignorées car non applicatives
- [x] Bug recherche sujet en prod — downshift remplace les types string par des nombres en production
- [x] Bug scroll index `/p` — scroll remontait en haut avec l'index alphabétique
- [x] PWA — application installable sur smartphone (manifest, icônes, meta tags)
- [x] Refonte page personnalités `/p` avec compteurs, recherche, index A-Z
- [x] Fix notoriety gap dans `create-public-figure-with-statement`
- [x] Analytics Plausible
- [x] `wikipedia_url` rendu optionnel + `notoriety_sources` ajouté
- [x] UI édition et suppression des sujets
- [x] Page profil `/me` avec dashboard compact
- [x] Table `reputation_events` comme source de vérité
- [x] Page historique de réputation `/reputation`
- [x] Page détail personnalité `/p/[slug]` avec citation et source
- [x] Page personnalités `/p` avec liste et ajout
- [x] Page hub « Contribuer » avec lien dans le header
- [x] Formulaire unifié « Nouvelle prise de position » avec upload photo
- [x] Wizard « Nouvelle personnalité » avec premier statement obligatoire
- [x] Wizard « Nouvelle position » avec premier statement obligatoire
- [x] CRUD sujets (création, édition, suppression, pré-remplissage formulaire)
- [x] Système d'invitation par contributeurs Éloquent (1000+ pts)
- [x] Authentification Supabase (inscription, invitation, middleware session)
- [x] Monitoring erreurs Sentry
- [x] Migration Next.js 15 → 16 (Turbopack, ESLint 9)
- [x] Validation Wikipedia (vérifier page biographie existante)
- [x] Validation date de preuve (refuser dates futures)
- [x] Script d'import de contenu (`npm run import:content`)
- [x] Compteurs dynamiques depuis la DB
- [x] UI authentique recréée (header, footer, page `/s`, sidebar)
- [x] CSS Modules et design system Débats préservé
- [x] Architecture DDD/Clean avec Effect Schema
- [x] Setup Supabase avec tables de base et types générés
- [x] Migration Nx vers Next.js 15 standalone
