# Débats.co

## Objectif du projet

Offrir une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.

Débats est un projet francophone et participatif qui vise à créer une plateforme collaborative de type wiki pour cartographier les positions et l'évolution de l'engagement des personnalités publiques sur des sujets de société controversés.

## Vision

- **Démocratie transparente** : Permettre aux citoyens de suivre les positions de leurs représentants
- **Rigueur intellectuelle** : Collecter et organiser les prises de position avec des sources vérifiables
- **Lutte contre la simplification** : Promouvoir un débat public nuancé
- **Crédibilité de l'engagement public** : Documenter l'évolution des positions dans le temps

## Les notions clés

- **Sujet** : un sujet de débat (ex : « Immigration », « Écologie », « Retraites »)
- **Position** : l'une des positions possibles sur un sujet
- **Personnalité** : une personnalité publique (politique, intellectuel·le, dirigeant·e d'institution, porte-parole d'organisation…). Critère de notoriété : elle doit avoir fait l'objet d'au moins deux publications dans des sources indépendantes et fiables (inspiré des [critères d'admissibilité Wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Notori%C3%A9t%C3%A9_des_personnes)). La page Wikipedia n'est pas obligatoire
- **Organisation** : un parti, une ONG, un syndicat, une entreprise, un lobby, un groupement économique, une association ou un collectif qui prend part au débat public. Même critère de notoriété que les personnalités
- **Prise de position** : ce qu'une personnalité ou une organisation a concrètement défendu sur un sujet, à une date donnée. Une personnalité peut changer de position au fil du temps
- **Preuve** : la source d'une prise de position (citation, article, vidéo, discours). Toute prise de position en demande au moins une
- **Argument** : un raisonnement avancé dans un débat, partagé par tout le site comme une étiquette et mobilisé par les prises de position. « Dignité de la personne » mobilisé sur deux sujets est un seul argument
- **Métier** et **affiliation** : les fonctions qu'occupe une personnalité (Ministre, Député·e, Secrétaire général·e de syndicat…) et les organisations auxquelles elle appartient

### Réputation et accréditation

Chaque acte de contribution rapporte des points, et chaque point ouvre des droits. Trois documents décrivent le système :

- [Réputation.md](Réputation.md) — le barème : ce que chaque acte rapporte
- [Niveaux.md](Niveaux.md) — les cinq rangs (Sophiste, Métèque, Éloquent·e, Idéaliste, Fondateur) et leurs seuils
- [Accréditation.md](Accréditation.md) — chaque action et le rang qu'elle demande

## Technologies

Next.js (App Router) et TypeScript, PostgreSQL via Supabase, Effect TS pour le domaine, CSS Modules, Vitest. L'architecture, le modèle de données et la configuration sont décrits dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Démarrage rapide

Prérequis : Node.js 22+, Docker et la [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm install
supabase start
supabase migration up        # Applique les migrations
cp .env.example .env.local   # Puis renseigner les clés affichées par supabase start
npm run dev
```

Le détail (variables d'environnement, commandes, Supabase local, production) est dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributions

Le projet est open source et accueille les contributions. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus d'informations.

## Licence

MIT
