# Guide de contribution - Débats.co

## Architecture

### Stack

- **Frontend/Backend** : Next.js 16 (App Router), TypeScript
- **Base de données** : PostgreSQL via Supabase
- **Authentification** : Supabase Auth
- **Écritures** : journal d'événements (`domain_events`) et projections dans les tables, via Prisma sans moteur Rust et l'adaptateur `pg`, avec transactions (voir `docs/adr/0001-journal-des-evenements.md`)
- **Domain** : Effect TS + Effect Schema, en Domain-Driven Design et Clean Architecture
- **Styling** : CSS Modules
- **Tests** : Vitest
- **Monitoring** : Sentry + Plausible

### Organisation des dossiers

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

### Modèle de données

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

### Styles et design system

Le style est en CSS Modules, organisé en trois couches :

- `styles/tokens.css` : uniquement les custom properties (surfaces, encre, signal, fontes, rayons, grille). Toute couleur ou fonte du site vient de là ; `npm run lint:css` (stylelint) refuse les anciens tokens et les fontes historiques.
- `styles/base.css` : reset et défauts d'éléments, dans des `@layer` pour qu'un module gagne toujours sur la base.
- `styles/text.module.css` : recettes typographiques partagées (`display`, `title`, `label`), réutilisées par les modules de page via `composes`.

Les fontes (Instrument Serif, Instrument Sans, JetBrains Mono) sont chargées par `next/font` dans `app/layout.tsx` et exposées en variables CSS sur `<html>`. Chaque composant garde son propre module colocalisé.

Les images OpenGraph (`opengraph-image.tsx`) sont rendues sans CSS : elles lisent les mêmes fontes au format TTF dans `public/fonts/` et les couleurs des tokens depuis `lib/og.ts`, avec les composants de `components/og/`.

### Versions précédentes

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

## Développement local

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

### Commandes Supabase essentielles

#### Démarrage et arrêt

```bash
# Démarrer l'environnement local (PostgreSQL + Auth + API)
supabase start

# Arrêter l'environnement
supabase stop

# Redémarrer complètement (reset DB)
supabase stop --no-backup
supabase start
```

#### Migrations

```bash
# Créer une nouvelle migration
supabase migration new nom_de_la_migration

# Appliquer les migrations (incrémental, préserve les données)
supabase migration up

# Voir le statut des migrations
supabase migration list

# Réparer une migration échouée
supabase migration repair --status applied
```

#### Base de données

```bash
# Accéder à psql
supabase db proxy

# Voir les logs de la DB
supabase db logs

# Dump de la DB locale
supabase db dump -f dump.sql

# Générer les types TypeScript depuis le schéma (après chaque migration)
supabase gen types typescript --local > types/database.types.ts
```

#### Développement

```bash
# Voir toutes les URLs locales
supabase status

# Accéder au Studio (interface admin)
# Ouvrir http://127.0.0.1:64323

# Voir les logs en temps réel
supabase logs --follow
```

#### Déploiement

Les migrations de production ne s'appliquent pas à la main : le déploiement lance `npm run migrate` (`supabase link` puis `supabase db push`) après le build. Une migration livrée dans `supabase/migrations` est donc appliquée par le déploiement du commit qui la contient.

> **Ne jamais utiliser `supabase config push`** — cela écraserait la production avec les valeurs locales (localhost, pas de confirmation email, rate limit 1s…).

### URLs locales importantes

Les ports sont configurés dans `supabase/config.toml` :

- **API**: http://127.0.0.1:64321
- **DB**: postgresql://postgres:postgres@127.0.0.1:64322/postgres
- **Studio**: http://127.0.0.1:64323
- **Inbucket** (emails): http://127.0.0.1:64324

## Configuration des clés API Supabase

### Types de clés

Supabase utilise deux types de clés API :

| Type            | Format               | Usage                                   |
| --------------- | -------------------- | --------------------------------------- |
| **Publishable** | `sb_publishable_...` | Client-side (navigateur, apps mobiles)  |
| **Secret**      | `sb_secret_...`      | Server-side uniquement (jamais exposée) |

> **Note** : Les clés `anon` et `service_role` sont **legacy** et seront supprimées. Utilisez les nouvelles clés Publishable/Secret.

### Variables d'environnement

```env
# Client-side (exposée dans le bundle JS)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx

# Server-side uniquement (JAMAIS dans NEXT_PUBLIC_*)
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

### Sécurité

- La clé **Publishable** est sécurisée par les Row Level Security (RLS) policies
- Ne jamais exposer la clé **Secret** côté client
- Les deux types de clés fonctionnent de manière identique avec le SDK Supabase

### Migration depuis les clés legacy

Si vous avez un projet existant avec les clés `anon`/`service_role` :

1. Aller dans Dashboard → Settings → API
2. Copier les nouvelles clés Publishable/Secret
3. Remplacer dans vos variables d'environnement
4. Les deux systèmes fonctionnent en parallèle pendant la transition

Référence : [Understanding API keys | Supabase Docs](https://supabase.com/docs/guides/api/api-keys)

## Agents et IA

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

Un chantier (`/admin/chantiers`) part d'une consigne en français, produit des brouillons et garde la conversation qui les a faits. L'agent est une session Managed Agents d'Anthropic, une par chantier, qui travaille avec les skills de contenu (`debats-agent`, `contribution-pipeline`, `find-*-positions`, `extract-positions-from-media`) publiés sur le compte Anthropic, et écrit par l'API des brouillons avec la clé d'administration tenue dans un coffre Anthropic ; il continue quand la page est fermée, et la page l'interroge toutes les six secondes tant qu'il travaille (ADR 0003). Tout ce qui doit survivre à la session vit en base : tables `chantiers` et `chantier_messages`, colonne `draft_statements.chantier_id`, champ `chantier` de `POST /api/drafts`. Clôturer un chantier arrête l'agent et ferme le fil ; le supprimer efface la session chez Anthropic, le fil et tous ses brouillons, jamais ce qu'une validation a créé sur le site. Des brouillons déjà là se reprennent en chantier par `POST /api/chantiers` (`{ title, brief, subjects?, drafts?, recap? }` : les brouillons de ces sujets que nul chantier ne tient, et ceux nommés un par un, qu'un chantier dont l'agent n'est pas lancé peut céder ; rien de ce qu'une validation a réglé ne bouge ; le `recap`, bilan d'une passe antérieure, ouvre le fil comme parole de l'agent), le chantier restant « Agent non lancé » jusqu'au bouton « Lancer l'agent » de sa page, qui ouvre une session avec un message de reprise (inventaire d'abord, bilan transmis) ; `npm run chantiers:adopt[:production] -- <plan.json> [--apply]` applique un plan tel que `docs/chantiers/reprise-2026-11-12.json` (par sujets) ou `docs/chantiers/reprise-100-sujets-2026-11-06.json` (une session Claude Code cloud reprise : sa consigne, son bilan, ses brouillons). L'agent range les brouillons du chantier en sections qu'il nomme (`draft_statements.section`, ordre dans `chantiers.sections` par `PATCH /api/chantiers/<id>`), avec pour ligne directrice ce qu'une validation changerait — tout déjà là, positions nouvelles, un sujet nouveau par section — que la page applique seule tant qu'il n'a rien rangé (`domain/read-models/chantier-sections.ts`). Une validation garde sur le brouillon ce qu'elle a fait (`draft_statements.validation` : l'identifiant de la prise de position, ce qui a été créé plutôt que réutilisé), et chaque décision de relecture — validé, rejeté, renvoyé — est transmise à l'agent du chantier encore ouvert et gardée dans le fil (`domain/services/review-notice.ts`, `noticeChantierReviewUseCase`) ; un agent qui n'entend pas — arrêté à son budget, ce qui n'alerte personne, ou injoignable, ce que Sentry note — ne défait pas la décision : la notification attend dans `chantier_unheard_notices` et lui est remise avec la relecture suivante ou quand son budget est repoussé.

Configuration en une fois, depuis une machine qui a la clé d'administration du site visé et les skills :

```bash
npm run chantier:setup:production   # crée l'environnement, le coffre (ADMIN_API_KEY, envoyée au seul hôte debats.co), publie les skills et crée l'agent, puis imprime les identifiants
```

Le script lit `ANTHROPIC_API_KEY`, `ADMIN_API_KEY` et `CHANTIER_SKILLS_DIR` dans l'environnement ; rien à faire dans la console Anthropic. Les skills ne sont pas dans ce dépôt (`.claude` est hors git) : `CHANTIER_SKILLS_DIR` désigne le dossier qui les tient, un sous-dossier par skill avec son `SKILL.md`, et chaque passage du script en publie une nouvelle version. Les trois identifiants imprimés sont à poser sur le site, qui les cite pour ouvrir une session à chaque chantier lancé :

| Variable                    | Rôle                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `CHANTIER_AGENT_ID`         | L'agent Managed Agents ; relancer le script avec cette variable posée met à jour son prompt                                |
| `CHANTIER_ENVIRONMENT_ID`   | L'environnement (conteneur, réseau ouvert)                                                                                 |
| `CHANTIER_VAULT_ID`         | Le coffre qui tient `ADMIN_API_KEY`                                                                                        |
| `CHANTIER_SKILLS_DIR`       | Lu par le script seulement : le dossier des skills à publier, hors dépôt                                                   |
| `DEBATS_URL`                | Seulement pour viser un autre site que `https://debats.co` (agent et coffre)                                               |
| `CHANTIER_BUDGET_CENTS`     | Plafond de départ d'une session, en cents de dollar (défaut : 2000) ; la page du chantier le repousse de 10 $ à la demande |
| `CHANTIER_REPOSITORY_URL`   | Le dépôt monté dans la session (défaut : `https://github.com/Debats/debats`)                                               |
| `CHANTIER_REPOSITORY_TOKEN` | Jeton GitHub, seulement si le dépôt est privé                                                                              |

Sans les trois premières, lancer un chantier répond que l'agent n'est pas configuré ; le reste du site n'en dépend pas.

## Workflow de développement

### 1. Créer une fonctionnalité

1. Commencer par le domain (entités, règles métier)
2. Créer la migration si nécessaire
3. Générer les types TypeScript
4. Implémenter les use cases
5. Créer l'interface utilisateur

### 2. Conventions de code

- **Nommage**: camelCase pour les variables, PascalCase pour les types/classes
- **Tests**: Écrire les tests d'abord (TDD)
- **Commits**: Messages descriptifs en anglais, comme le code et ses commentaires

### 3. Avant de commiter

```bash
# Vérification complète (lint + format + typecheck + build)
npm run check
```

## Règles métier importantes

### Système de réputation

Le barème est dans [Réputation.md](Réputation.md), les rangs et leurs seuils dans [Niveaux.md](Niveaux.md), les droits que chaque rang ouvre dans [Accréditation.md](Accréditation.md).

### Personnalités publiques

- **Critère de notoriété** : une personnalité doit avoir fait l'objet d'au moins deux publications dans des sources indépendantes et fiables (presse, institution, rapport officiel…), inspiré des [critères d'admissibilité Wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Notori%C3%A9t%C3%A9_des_personnes)
- La page Wikipedia n'est pas obligatoire mais reste un enrichissement recommandé
- Sans page Wikipedia, le contributeur doit fournir au moins 2 URLs de sources indépendantes attestant de la notoriété

### Prises de position

- Une personnalité peut changer de position sur un sujet au fil du temps ; chaque prise de position est datée
- Toute prise de position doit avoir au moins une preuve
- Les preuves doivent être sourcées et datées
- Une preuve (evidence) doit pointer vers une source publiquement accessible et vérifiable : source primaire (tweet officiel, communiqué, discours filmé) ou source tierce (article de presse, interview, audition parlementaire)

## Ressources

- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation TypeScript](https://www.typescriptlang.org/docs)
