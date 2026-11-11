# ADR 0003 — Les chantiers : un agent hébergé, un état chez nous

Date : 10 novembre 2026. Statut : accepté.

## Contexte

Les brouillons sont produits par des skills lancés depuis une session Claude Code, dans un terminal ou dans le cloud, et relus un par un sur `/admin/drafts`. Le goulot est la relecture, et la relecture se fait loin de la conversation qui a produit les brouillons : impossible de dire à l'agent « il manque des voix opposées » depuis le site, ni de savoir où il en est.

L'amendement d'un brouillon avec Claude (commit `1723df8`) a montré qu'un dialogue à côté du formulaire marche, mais il ne porte qu'un brouillon, ne conserve rien et n'écrit rien tout seul. Ce qu'il faut, c'est travailler **par chantier** : une consigne en français, les brouillons qu'elle produit, et la conversation qui les a faits, conservée.

Un chantier dure plus qu'une requête et doit continuer quand la page est fermée. Next.js n'a pas de service d'arrière-plan : `after()` vit tant que le processus vit, et chaque déploiement sur Clever le tue. Deux voies restaient : un processus à part qui dépile une file, ou un agent hébergé.

## Décision

1. **L'agent est une session Managed Agents d'Anthropic, une par chantier.** Anthropic fait tourner la boucle, garde l'historique et le conteneur ; la session reste en veille entre deux messages. Le dépôt GitHub est monté dans la session, ce qui fait découvrir les skills de `.claude/skills` : les règles de collecte sont réutilisées telles quelles. La clé d'administration du site vit dans un coffre Anthropic comme variable d'environnement substituée à la sortie, pour le seul hôte du site, dans le seul en-tête : les `curl` des skills marchent sans changement et la clé n'entre jamais dans l'historique. Pas de serveur MCP : l'API des brouillons existante suffit. Configuration en une fois par `npm run chantier:setup` (`scripts/chantier-agent-setup.ts`), identifiants en variables d'environnement.
2. **Tout ce qui doit survivre à Anthropic vit chez nous.** La table `chantiers` porte la consigne, le nom (donné par l'agent dans sa première réponse, ligne `# …`), le statut, l'identifiant de session et le curseur de lecture ; `chantier_messages` est le miroir de la conversation, un message par événement, l'identifiant d'événement rendant le miroir idempotent ; `draft_statements.chantier_id` rattache chaque brouillon à son chantier, et l'API `POST /api/drafts` accepte `chantier`. Si la session disparaît, le chantier reste lisible avec ses brouillons et son fil.
3. **Rien ne tourne chez nous en dehors d'une requête.** Lancer un chantier crée la ligne puis la session (la ligne d'abord, pour que l'agent connaisse l'identifiant que ses brouillons porteront) ; écrire à l'agent envoie l'événement puis miroite le message, jamais l'inverse, pour que le site n'affirme jamais plus que ce que l'agent a reçu ; rafraîchir lit les événements depuis le curseur, miroite les réponses de l'agent et prend son statut. La page d'un chantier rafraîchit à l'ouverture et interroge toutes les six secondes tant que l'agent travaille ; un webhook Console pourra remplacer l'interrogation, sans rien changer d'autre. Pas de processus à part : il n'aurait rien à faire tourner.
4. **Le chantier est un use case à part entière**, pas un échafaudage comme les brouillons : `launchChantierUseCase`, `tellChantierUseCase`, `refreshChantierUseCase`, `closeChantierUseCase` déclarent leurs services (`ChantierRepository`, `ChantierAgent`), le port de l'agent est dans le domaine (`domain/services/chantier-agent.ts`), l'adaptateur dans `infra/ai/chantier-agent-anthropic.ts`, la lecture des événements en fonction pure testée (`chantier-session-news.ts`). Un échec de l'agent est un `AgentUnavailable`, rendu en message par `runCommand`.
5. **L'agent agit, la personne valide.** L'agent écrit les brouillons par l'API, les corrige, les écarte ; il ne valide jamais, ne crée pas de sujet sans accord, et répond d'abord par un plan qu'il attend de voir approuvé. Le statut du chantier dit où il en est : il travaille, il attend la personne, il attend la console Anthropic (budget, décision), sa session est terminée, ou la personne a clôturé. Chaque session a un budget en dollars, borné à la création.

## Conséquences

- Variables à poser en production avant de déployer : `CHANTIER_AGENT_ID`, `CHANTIER_ENVIRONMENT_ID`, `CHANTIER_VAULT_ID`, et à l'occasion `CHANTIER_BUDGET_CENTS`, `CHANTIER_REPOSITORY_URL`, `CHANTIER_REPOSITORY_TOKEN`, `DEBATS_URL` (pour viser un autre site que `https://debats.co`). Sans les deux premières, lancer un chantier répond que l'agent n'est pas configuré.
- Les Managed Agents sont en bêta : en-tête de version posé par le SDK, forme des événements susceptible de bouger. Le site n'en lit que trois choses (le texte des messages, le statut de session, la raison d'un arrêt), isolées dans `chantier-session-news.ts`.
- Une session est facturée au temps actif et aux jetons ; le budget par défaut est de 20 $ par chantier. À regarder sur les premiers chantiers.
- La conversation miroitée ne porte que le texte : ce que l'agent a lu, les commandes qu'il a lancées restent dans la console Anthropic. Un lien vers la session s'ajoutera si le besoin apparaît.
- Le brief permanent de l'agent (`debats-agent`) ne vit pas dans le dépôt : l'essentiel en est repris dans `infra/ai/chantier-agent-prompt.ts`, à tenir à jour avec lui.
- Les 1 000 brouillons antérieurs restent hors chantier, groupés comme avant. Reprendre un groupe en chantier est l'étape suivante.
