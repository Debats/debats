# Guide de contribution - Débats.co

## Architecture

### Structure du projet

- **Domain-Driven Design (DDD)** avec Clean Architecture
- **TypeScript** pour le typage fort
- **Next.js** pour le fullstack
- **Supabase** pour la persistence (PostgreSQL + Auth)
- **CSS Modules** pour le styling

### Organisation des dossiers

```
├── app/              # Next.js app router
├── domain/           # Logique métier (entités, services, règles)
├── infra/            # Infrastructure (DB, APIs externes)
│   └── database/     # Client Supabase
├── supabase/         # Config et migrations Supabase
└── public/           # Assets statiques
```

## Développement local

### Prérequis

- Node.js 22+
- Docker (pour Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Installation

```bash
# Installer les dépendances
npm install
```

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

> **Attention** : `supabase db reset` détruit toutes les données locales et recrée la base depuis zéro. Préférer `supabase migration up` pour le développement courant.

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

```bash
# Lier à un projet Supabase cloud
supabase link --project-ref <project-id>

# Pousser les migrations vers le cloud
supabase db push

# Pousser migrations + seeds vers le cloud
supabase db push --include-seed

# Récupérer les migrations depuis le cloud
supabase db pull
```

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

### URLs locales importantes

Les ports sont configurés dans `supabase/config.toml` :

- **API**: http://127.0.0.1:64321
- **DB**: postgresql://postgres:postgres@127.0.0.1:64322/postgres
- **Studio**: http://127.0.0.1:64323
- **Inbucket** (emails): http://127.0.0.1:64324

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
- **Commits**: Messages descriptifs en français

### 3. Avant de commiter

```bash
# Vérification complète (lint + format + typecheck + build)
npm run check
```

Commandes individuelles disponibles :

```bash
npm test              # Tests (Vitest)
npm run lint          # Linting (ESLint)
npm run format        # Formatage (Prettier)
npm run typecheck     # Vérification des types
```

## Règles métier importantes

### Système de réputation

- Nouveaux utilisateurs: 0 points
- Créer un sujet: minimum 50 points requis
- Éditer un sujet: minimum 100 points requis
- Modération: réservée aux utilisateurs de confiance

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
