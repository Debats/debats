# Débats.co

## Objectif du projet

Offrir une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.

Débats est un projet francophone et participatif qui vise à créer une plateforme collaborative de type wiki pour cartographier les positions et l'évolution de l'engagement des personnalités publiques sur des sujets de société controversés.

## Vision

- **Démocratie transparente** : Permettre aux citoyens de suivre les positions de leurs représentants
- **Rigueur intellectuelle** : Collecter et organiser les prises de position avec des sources vérifiables
- **Lutte contre la simplification** : Promouvoir un débat public nuancé
- **Crédibilité de l'engagement public** : Documenter l'évolution des positions dans le temps

## Historique du projet

Le projet a été initié en 2014 et a connu plusieurs itérations technologiques :

### 1. Ruby Backend (2014-2018)

- **Stack** : Ruby on Rails fullstack
- **État** : Version la plus aboutie avec modèle de données complet
- **Localisation** : retirée de l'arbre de travail en novembre 2026, `git checkout 420165b -- ruby-backend`
- **Fonctionnalités** : CRUD complet, authentification, upload d'images

### 2. Frontend React (2018-2019)

- **Stack** : React + Redux + GraphQL
- **État** : Interface utilisateur moderne mais incomplète
- **Localisation** : retirée de l'arbre de travail en novembre 2026, `git checkout 420165b -- frontend`
- **Objectif** : Moderniser l'interface utilisateur

### 3. API GraphQL (2019-2020)

- **Stack** : Node.js + GraphQL + Prisma
- **État** : API moderne mais non finalisée
- **Localisation** : retirée de l'arbre de travail en novembre 2026, `git checkout 420165b -- api`
- **Objectif** : Remplacer le backend Ruby par une API moderne

### 4. Elixir Phoenix (2020-2021)

- **Stack** : Elixir + Phoenix + PostgreSQL
- **État** : Refonte complète mais abandonnée
- **Localisation** : retirée de l'arbre de travail en novembre 2026, `git checkout 420165b -- debats-elixir`
- **Objectif** : Performance et fiabilité

### 5. Next.js Standalone (actuel)

- **Stack** : Next.js 16 + TypeScript + Supabase + Effect TS
- **État** : En cours de développement
- **Localisation** : racine du projet
- **Objectif** : Consolidation et première version exploitable

## Modèle de données

Le cœur du modèle est cohérent entre toutes les versions :

```
Subject (Sujet)
├── Positions (ex: "Pour", "Contre", "Nuancé")
    └── Statements (Prises de position)
        ├── PublicFigure (Personnalité)
        │   └── OrganisationMembership (Affiliation) ── Organisation
        ├── Evidence (Preuves/Sources)
        └── Arguments

Contributors (Contributeurs)
```

### Entités principales

- **Subject** : Les sujets de débat (ex: "Immigration", "Écologie", "Retraites")
- **Position** : Les différentes positions possibles sur un sujet
- **PublicFigure** : Les personnalités publiques (politiques, intellectuels, dirigeants d'institutions, porte-paroles d'organisations, etc.) - **Critère de notoriété : la personnalité doit avoir fait l'objet d'au moins deux publications dans des sources indépendantes et fiables** (inspiré des [critères d'admissibilité Wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Notori%C3%A9t%C3%A9_des_personnes)). La page Wikipedia n'est pas obligatoire.
- **Organisation** : Les partis, ONG, syndicats, entreprises, lobbies, groupements économiques, associations et collectifs qui prennent part au débat public. Même critère de notoriété que les personnalités ; logo optionnel
- **OrganisationMembership** : L'affiliation d'une personnalité à une organisation, avec un rôle et une période optionnels. Sans date de fin, l'affiliation est considérée comme actuelle
- **OccupationFamily** et **Occupation** : Les métiers et fonctions des personnalités, en deux niveaux fermés gérés par les Idéalistes sur `/metiers` : une famille (Exécutif, Élu·e national·e, Syndicaliste…) regroupe des métiers (Ministre, Député·e, Secrétaire général·e de syndicat…). Une personnalité tient zéro, un ou plusieurs métiers, sans hiérarchie ; les Éloquent·es les attribuent depuis la page de modification de la personnalité. Les statistiques se lisent par famille
- **Statement** : Les prises de position concrètes d'une personnalité ou d'une organisation sur une position (exactement un auteur)
- **Evidence** : Les preuves et sources (citations, articles, vidéos, discours)
- **Argument** : Les raisonnements avancés dans un débat, partagés par tout le site comme des étiquettes (titre unique, slug, description optionnelle) et mobilisés par les prises de position. « Dignité de la personne » mobilisé sur deux sujets est un seul argument. Les sujets et positions qu'un argument sert se déduisent des prises de position ; sur un sujet, un argument repris par plusieurs positions est dit polarisant. Les Idéalistes peuvent renommer un argument ou le fusionner dans un autre
- **Contributor** : Les utilisateurs contributeurs de la plateforme

### Réputation et accréditation

Chaque acte de contribution rapporte des points, et chaque point ouvre des droits. Trois documents décrivent le
système, la référence exécutable restant `domain/reputation/permissions.ts` :

- [Réputation.md](Réputation.md) — le barème : ce que chaque acte rapporte, comment un gain est écrit dans la
  transaction de l'acte qu'il récompense, et quels gains sont définis mais pas encore accordés
- [Niveaux.md](Niveaux.md) — les cinq rangs (Sophiste, Métèque, Éloquent·e, Idéaliste, Fondateur) et leurs seuils
- [Accréditation.md](Accréditation.md) — chaque action, le rang qu'elle demande et le use case qui la contrôle

## Architecture technique actuelle

### Stack

- **Frontend/Backend** : Next.js 16 (App Router)
- **Base de données** : PostgreSQL via Supabase
- **Authentification** : Supabase Auth
- **Écritures** : journal d'événements (`domain_events`) et projections dans les tables, via Prisma sans moteur Rust et l'adaptateur `pg`, avec transactions (voir `docs/adr/0001-journal-des-evenements.md`)
- **Domain** : Effect TS + Effect Schema
- **Styling** : CSS Modules
- **Tests** : Vitest
- **Monitoring** : Sentry + Plausible

### Structure

```
├── app/              # Next.js App Router (pages et Server Actions)
├── domain/           # Logique métier (entités, services, règles, use cases)
├── infra/            # Infrastructure (Supabase, Wikipedia API)
├── components/       # Composants React réutilisables
├── hooks/            # React hooks
├── lib/              # Utilitaires de présentation (formatage de dates…)
├── styles/           # CSS Modules et design system
├── supabase/         # Migrations et seeds
├── types/            # Types générés (database.types.ts)
├── docs/             # Documentation et maquettes de référence
└── public/           # Assets statiques (polices, images)
```

### Styles et design system

Le style est en CSS Modules, organisé en trois couches :

- `styles/tokens.css` : uniquement les custom properties (surfaces, encre, signal, fontes, rayons, grille). Toute couleur ou fonte du site vient de là ; `npm run lint:css` (stylelint) refuse les anciens tokens et les fontes historiques.
- `styles/base.css` : reset et défauts d'éléments, dans des `@layer` pour qu'un module gagne toujours sur la base.
- `styles/text.module.css` : recettes typographiques partagées (`display`, `title`, `label`), réutilisées par les modules de page via `composes`.

Les fontes (Instrument Serif, Instrument Sans, JetBrains Mono) sont chargées par `next/font` dans `app/layout.tsx` et exposées en variables CSS sur `<html>`. Chaque composant garde son propre module colocalisé.

Les images OpenGraph (`opengraph-image.tsx`) sont rendues sans CSS : elles lisent les mêmes fontes au format TTF dans `public/fonts/` et les couleurs des tokens depuis `lib/og.ts`, avec les composants de `components/og/`.

### Projets legacy

Les quatre versions précédentes ont quitté l'arbre de travail en novembre 2026, une fois leur audit terminé et ce
qu'elles avaient encore d'utile consigné dans `TODO.md`, `Réputation.md`, `Niveaux.md` et `Accréditation.md`. Elles
restent intégralement dans l'historique git, au commit `420165b` :

```bash
git checkout 420165b -- ruby-backend        # Rails, 2014-2018
git checkout 420165b -- frontend            # React + Redux + GraphQL, 2016-2018
git checkout 420165b -- api                 # Node + GraphQL + Prisma, 2018
git checkout 420165b -- debats-elixir       # Phoenix, 2020
git show 420165b:ruby-backend/config/reputation.yml   # ou un seul fichier
```

La version Phoenix vivait hors dépôt et dans aucun historique : `420165b` l'y a fait entrer avant de la supprimer,
sources seules.

## Développement

### Prérequis

- Node.js 22+
- Docker (pour Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Installation

```bash
npm install
supabase start
supabase migration up  # Applique les migrations
```

> **Attention** : `supabase db reset` détruit toutes les données locales. Préférer `supabase migration up` pour appliquer les migrations de manière incrémentale.

### Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner les valeurs :

```bash
cp .env.example .env.local
```

Les variables essentielles pour le développement local :

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clé affichée par supabase start>
SUPABASE_SECRET_KEY=<clé affichée par supabase start>
SIGNUP_SECRET_TOKEN=<token pour l'inscription par invitation>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:64322/postgres
```

`DATABASE_URL` est la connexion Postgres directe de la couche d'écriture (Prisma). En production, c'est l'adresse du pooler Supabase.

Voir `.env.example` pour la liste complète des variables.

### API d'administration

Les agents de collecte (skills `contribution-pipeline` et compagnie, tâches planifiées) parlent au site par une API protégée par une clé Bearer, `ADMIN_API_KEY`. Trois variables la concernent, à poser en production **avant** de déployer une route qui en dépend :

| Variable               | Rôle                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ADMIN_API_KEY`        | La clé attendue dans `Authorization: Bearer …`                                                                                 |
| `ADMIN_CONTRIBUTOR_ID` | Le contributeur (`contributors.id`, rang Éloquent au moins) au nom duquel les routes d'enrichissement écrivent dans le journal |
| `DEBATS_URL`           | Le site visé par `npm run verify:drafts`                                                                                       |

Routes : `GET /api/catalog` (sujets, positions, personnalités, organisations, métiers), `GET/POST /api/drafts`, `PATCH/DELETE /api/drafts/<id>`, `POST /api/drafts/<id>/review`, `GET /api/public-figures/<slug>`, `PATCH /api/public-figures/<slug>/occupations`, `POST /api/public-figures/<slug>/affiliations`, `DELETE /api/public-figures/<slug>/affiliations/<id>`, `POST /api/organisations`, `PATCH /api/organisations/<slug>`, `GET /api/statements?subject=|figure=|organisation=<slug>`, `GET/PATCH /api/statements/<id>`. Les brouillons attendent une relecture humaine ; les routes d'enrichissement et de correction écrivent directement, par les mêmes commandes que l'interface.

### Relecture assistée

Le formulaire de prise de position demande à Claude un avis sur la rédaction de chaque champ, à la sortie du champ (`infra/ai/proofreader.ts`, action `proofreadContribution`). L'avis ne bloque rien et n'est jamais enregistré. Une variable, à poser en production **avant** de déployer :

| Variable            | Rôle                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | La clé de l'API Anthropic ; sans elle, la relecture se dit indisponible et la contribution part quand même (ADR 0002) |

La même clé sert au dialogue d'amendement des brouillons (`/admin/drafts`, « Amender ») : l'admin discute avec Claude, qui relit le brouillon, lit la source (HTML et texte seulement, jamais un PDF) et réécrit les champs dans le formulaire, chacun marqué « Modifié par l'IA » et annulable ; un champ retouché à la main n'est plus touché. Le contrat vit dans `domain/services/draft-revision.ts`, l'adaptateur dans `infra/ai/draft-reviser.ts`, l'action `reviseDraft` est sans état : rien n'est enregistré avant « Valider le brouillon » ou « Enregistrer sans valider ».

### Chantiers

Un chantier (`/admin/chantiers`) part d'une consigne en français, produit des brouillons et garde la conversation qui les a faits. L'agent est une session Managed Agents d'Anthropic, une par chantier, qui travaille avec les skills de contenu (`debats-agent`, `contribution-pipeline`, `find-*-positions`, `extract-positions-from-media`) publiés sur le compte Anthropic, et écrit par l'API des brouillons avec la clé d'administration tenue dans un coffre Anthropic ; il continue quand la page est fermée, et la page l'interroge toutes les six secondes tant qu'il travaille (ADR 0003). Tout ce qui doit survivre à la session vit en base : tables `chantiers` et `chantier_messages`, colonne `draft_statements.chantier_id`, champ `chantier` de `POST /api/drafts`. Clôturer un chantier arrête l'agent et ferme le fil ; le supprimer efface la session chez Anthropic, le fil et tous ses brouillons, jamais ce qu'une validation a créé sur le site. Des brouillons déjà là se reprennent en chantier par `POST /api/chantiers` (`{ title, brief, subjects?, drafts?, recap? }` : les brouillons de ces sujets que nul chantier ne tient, et ceux nommés un par un, qu'un chantier dont l'agent n'est pas lancé peut céder ; rien de ce qu'une validation a réglé ne bouge ; le `recap`, bilan d'une passe antérieure, ouvre le fil comme parole de l'agent), le chantier restant « Agent non lancé » jusqu'au bouton « Lancer l'agent » de sa page, qui ouvre une session avec un message de reprise (inventaire d'abord, bilan transmis) ; `npm run chantiers:adopt[:production] -- <plan.json> [--apply]` applique un plan tel que `docs/chantiers/reprise-2026-11-12.json` (par sujets) ou `docs/chantiers/reprise-100-sujets-2026-11-06.json` (une session Claude Code cloud reprise : sa consigne, son bilan, ses brouillons). L'agent range les brouillons du chantier en sections qu'il nomme (`draft_statements.section`, ordre dans `chantiers.sections` par `PATCH /api/chantiers/<id>`), avec pour ligne directrice ce qu'une validation changerait — tout déjà là, positions nouvelles, un sujet nouveau par section — que la page applique seule tant qu'il n'a rien rangé (`domain/read-models/chantier-sections.ts`). Une validation garde sur le brouillon ce qu'elle a fait (`draft_statements.validation` : l'identifiant de la prise de position, ce qui a été créé plutôt que réutilisé), et chaque décision de relecture — validé, rejeté, renvoyé — est transmise à l'agent du chantier encore ouvert et gardée dans le fil (`domain/services/review-notice.ts`, `noticeChantierReviewUseCase`) ; un agent injoignable ne défait pas la décision, Sentry le note.

Configuration en une fois, depuis une machine qui a la clé d'administration du site visé et les skills :

```bash
npm run chantier:setup:production   # crée l'environnement, le coffre (ADMIN_API_KEY, envoyée au seul hôte debats.co), publie les skills et crée l'agent, puis imprime les identifiants
```

Le script lit `ANTHROPIC_API_KEY`, `ADMIN_API_KEY` et `CHANTIER_SKILLS_DIR` dans l'environnement ; rien à faire dans la console Anthropic. Les skills ne sont pas dans ce dépôt (`.claude` est hors git) : `CHANTIER_SKILLS_DIR` désigne le dossier qui les tient, un sous-dossier par skill avec son `SKILL.md`, et chaque passage du script en publie une nouvelle version. Les trois identifiants imprimés sont à poser sur le site, qui les cite pour ouvrir une session à chaque chantier lancé :

| Variable                    | Rôle                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `CHANTIER_AGENT_ID`         | L'agent Managed Agents ; relancer le script avec cette variable posée met à jour son prompt |
| `CHANTIER_ENVIRONMENT_ID`   | L'environnement (conteneur, réseau ouvert)                                                  |
| `CHANTIER_VAULT_ID`         | Le coffre qui tient `ADMIN_API_KEY`                                                         |
| `CHANTIER_SKILLS_DIR`       | Lu par le script seulement : le dossier des skills à publier, hors dépôt                    |
| `DEBATS_URL`                | Seulement pour viser un autre site que `https://debats.co` (agent et coffre)                |
| `CHANTIER_BUDGET_CENTS`     | Plafond de dépense d'une session, en cents (défaut : 2000)                                  |
| `CHANTIER_REPOSITORY_URL`   | Le dépôt monté dans la session (défaut : `https://github.com/Debats/debats`)                |
| `CHANTIER_REPOSITORY_TOKEN` | Jeton GitHub, seulement si le dépôt est privé                                               |

Sans les trois premières, lancer un chantier répond que l'agent n'est pas configuré ; le reste du site n'en dépend pas.

### Lancement

```bash
npm run dev
```

### Commandes utiles

```bash
npm run dev           # Serveur de développement
npm test              # Tests (Vitest)
npm run lint          # Linting (ESLint)
npm run format        # Formatage (Prettier)
npm run typecheck     # Vérification des types
npm run check         # Lint + format + typecheck + build (à lancer avant chaque commit)
npm run test:db       # Tests d'intégration contre la base locale (journal d'événements)
npm run prisma:pull   # Réintrospecte le schéma Prisma après une migration Supabase
npm run prisma:generate  # Régénère le client Prisma (fait aussi à l'installation)
```

Après chaque migration Supabase : `supabase migration up`, puis `npm run prisma:pull` et `supabase gen types typescript --local > types/database.types.ts`.

### Configuration de production

La configuration auth de production (URLs, templates email, rate limits…) est gérée par un script dédié, **pas** par `supabase config push` (qui écraserait la prod avec les valeurs locales).

```bash
npm run supabase:config:push            # Affiche le diff et demande confirmation
npm run supabase:config:push -- --yes   # Push sans confirmation
```

Le script lit les credentials depuis `.env.production` et les templates email depuis `supabase/templates/`. La config est déclarée en dur dans `scripts/push-prod-auth-config.ts` pour être auditable dans le diff git.

### Supabase local

```bash
supabase start        # Démarrer l'environnement local
supabase stop         # Arrêter l'environnement
supabase migration up # Appliquer les migrations

# Générer les types TypeScript après chaque migration
supabase gen types typescript --local > types/database.types.ts
```

Les URLs locales sont configurées sur le port **64321** (voir `supabase/config.toml`) :

- **API** : http://127.0.0.1:64321
- **Studio** : http://127.0.0.1:64323
- **Inbucket** (emails) : http://127.0.0.1:64324

## Feuille de route

### Phase 1 : MVP

- [x] Consolidation du modèle de données
- [x] Interface de consultation des sujets et positions
- [x] Authentification Supabase (inscription par invitation)
- [x] CRUD sujets, personnalités, positions, prises de position
- [x] Système de réputation des contributeurs
- [x] Organisations et affiliations des personnalités
- [x] Prises de position des organisations (formulaire, page organisation, page sujet et filtre)
- [x] Arguments mobilisés par les prises de position (autocomplétion dans le formulaire, onglet Arguments d'un sujet, pages `/arguments`, analyses, renommage et fusion)

### Phase 2 : Fonctionnalités collaboratives

- [ ] Système de modération
- [ ] Historique des modifications
- [ ] Interface d'administration

### Phase 3 : Fonctionnalités avancées

- [ ] Recherche et filtres avancés
- [ ] API publique
- [ ] Export de données
- [ ] Analyses et statistiques

## Contributions

Le projet est open source et accueille les contributions. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus d'informations.

## Licence

MIT
