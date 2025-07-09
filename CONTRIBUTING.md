# Guide de contribution - Débats.co

## Architecture

### Structure du projet
- **Domain-Driven Design (DDD)** avec Clean Architecture
- **TypeScript** pour le typage fort
- **Next.js** pour le fullstack
- **Supabase** pour la persistence (PostgreSQL + Auth)
- **Tailwind CSS** + CSS Modules pour le styling

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
- Node.js 18+
- Docker (pour Supabase local)
- npm ou pnpm

### Installation
```bash
# Installer les dépendances
npm install

# Installer la CLI Supabase globalement
npm install -g supabase
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

# Appliquer les migrations
supabase db reset

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
# Ouvrir http://127.0.0.1:54323

# Voir les logs en temps réel
supabase logs --follow
```

#### Déploiement (futur)
```bash
# Lier à un projet Supabase cloud
supabase link --project-ref <project-id>

# Pousser les migrations vers le cloud
supabase db push

# Récupérer les migrations depuis le cloud
supabase db pull
```

### URLs locales importantes
- **API**: http://127.0.0.1:54321
- **DB**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio**: http://127.0.0.1:54323
- **Inbucket** (emails): http://127.0.0.1:54324

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
# Lancer les tests
npm test

# Vérifier le linting
npm run lint

# Formater le code
npm run format
```

## Règles métier importantes

### Système de réputation
- Nouveaux utilisateurs: 0 points
- Créer un sujet: minimum 50 points requis
- Éditer un sujet: minimum 100 points requis
- Modération: réservée aux utilisateurs de confiance

### Prises de position
- Une personnalité = une position par sujet
- Toute prise de position doit avoir au moins une preuve
- Les preuves doivent être sourcées et datées

## Ressources
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation TypeScript](https://www.typescriptlang.org/docs)