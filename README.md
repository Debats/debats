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

- **Stack** : Next.js 15 + TypeScript + Supabase + Effect TS
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

Users (Contributeurs)
```

### Entités principales

- **Subject** : Les sujets de débat (ex: "Immigration", "Écologie", "Retraites")
- **Position** : Les différentes positions possibles sur un sujet
- **PublicFigure** : Les personnalités publiques (politiques, intellectuels, etc.) - **Critère de notoriété : toute personnalité doit avoir une page Wikipedia valide**
- **Statement** : Les prises de position concrètes d'une personnalité sur une position
- **Evidence** : Les preuves et sources (citations, articles, vidéos, discours)
- **Argument** : Les arguments développés pour défendre une position
- **User** : Les utilisateurs contributeurs de la plateforme

## Architecture technique actuelle

### Stack

- **Frontend/Backend** : Next.js 15 (App Router)
- **Base de données** : PostgreSQL via Supabase
- **Authentification** : Supabase Auth
- **Domain** : Effect TS + Effect Schema
- **Styling** : CSS Modules

### Structure

```
├── app/              # Next.js App Router
├── domain/           # Logique métier (entités, services, règles)
├── infra/            # Infrastructure (Supabase, APIs)
├── components/       # Composants React réutilisables
├── supabase/         # Migrations et seeds
└── types/            # Types générés
```

### Projets legacy (référence)

- `ruby-backend/` : Application Rails originale
- `debats-elixir/` : Version Phoenix abandonnée

## Développement

### Prérequis

- Node.js 20+
- Docker (pour Supabase local)
- Nix + direnv (recommandé)

### Installation

```bash
npm install
supabase start
supabase db reset  # Applique migrations + seeds
```

### Variables d'environnement

Créer un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé anon locale>
```

### Lancement du développement

```bash
npm run dev
```

## Feuille de route

### Phase 1 : MVP

- [ ] Consolidation du modèle de données
- [ ] Interface de base pour consulter sujets et positions
- [ ] Authentification simple
- [ ] CRUD basique pour les entités principales

### Phase 2 : Fonctionnalités collaboratives

- [ ] Système de contribution et modération
- [ ] Historique des modifications
- [ ] Système de réputation des contributeurs
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
