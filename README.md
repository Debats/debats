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
- **Localisation** : `ruby-backend/`
- **Fonctionnalités** : CRUD complet, authentification, upload d'images

### 2. Frontend React (2018-2019)

- **Stack** : React + Redux + GraphQL
- **État** : Interface utilisateur moderne mais incomplète
- **Localisation** : `frontend/`
- **Objectif** : Moderniser l'interface utilisateur

### 3. API GraphQL (2019-2020)

- **Stack** : Node.js + GraphQL + Prisma
- **État** : API moderne mais non finalisée
- **Localisation** : `api/`
- **Objectif** : Remplacer le backend Ruby par une API moderne

### 4. Elixir Phoenix (2020-2021)

- **Stack** : Elixir + Phoenix + PostgreSQL
- **État** : Refonte complète mais abandonnée
- **Localisation** : `debats-elixir/`
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
        ├── Evidence (Preuves/Sources)
        └── Arguments

Contributors (Contributeurs)
```

### Entités principales

- **Subject** : Les sujets de débat (ex: "Immigration", "Écologie", "Retraites")
- **Position** : Les différentes positions possibles sur un sujet
- **PublicFigure** : Les personnalités publiques (politiques, intellectuels, dirigeants d'institutions, porte-paroles d'organisations, etc.) - **Critère de notoriété : la personnalité doit avoir fait l'objet d'au moins deux publications dans des sources indépendantes et fiables** (inspiré des [critères d'admissibilité Wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Notori%C3%A9t%C3%A9_des_personnes)). La page Wikipedia n'est pas obligatoire.
- **Statement** : Les prises de position concrètes d'une personnalité sur une position
- **Evidence** : Les preuves et sources (citations, articles, vidéos, discours)
- **Argument** : Les arguments développés pour défendre une position
- **Contributor** : Les utilisateurs contributeurs de la plateforme

## Architecture technique actuelle

### Stack

- **Frontend/Backend** : Next.js 16 (App Router)
- **Base de données** : PostgreSQL via Supabase
- **Authentification** : Supabase Auth
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
├── styles/           # CSS Modules et design system
├── supabase/         # Migrations et seeds
├── types/            # Types générés (database.types.ts)
├── docs/             # Documentation et maquettes de référence
└── public/           # Assets statiques (polices, images)
```

### Projets legacy (référence)

- `ruby-backend/` : Application Rails originale
- `debats-elixir/` : Version Phoenix abandonnée

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
```

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
```

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
