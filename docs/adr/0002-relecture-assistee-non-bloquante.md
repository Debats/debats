# ADR 0002 — Relecture assistée, non bloquante et sans trace

Date : 9 novembre 2026. Statut : accepté.

## Contexte

Les règles de rédaction du site sont nombreuses et peu intuitives : un titre de sujet ne porte pas d'avis, une citation se recopie mot pour mot et doit énoncer la position à elle seule, une présentation est factuelle. Les brouillons produits par les agents montrent que ces règles sont enfreintes souvent, et que la relecture humaine est le goulot. Une personne qui contribue à la main n'a, au moment où elle écrit, que des infobulles pour s'en souvenir.

Le site ne dit pas qui a raison. Tout assistant posé sur le formulaire doit donc juger la **rédaction** et jamais l'**opinion**, et ne doit jamais devenir un filtre : la modération est humaine.

## Décision

1. **Un avis par champ, demandé à Claude, à la sortie de chaque champ modifié.** Le formulaire de prise de position (`components/statements/NewStatementForm`) envoie à l'action `proofreadContribution` ce qui est en train d'être écrit (les champs des panneaux ouverts, le contenu selon sa nature, la source) et reçoit pour chaque champ un verdict `ok` / `warning` / `problem` et une phrase qui dit quoi faire. Un seul appel pour toute la contribution, pas un par champ : le contrôle le plus utile est croisé (la citation énonce-t-elle la position ?). L'appel part quand un champ est quitté après avoir été modifié depuis la dernière lecture, jamais à la frappe ; seule la dernière réponse compte, et l'avis sur un champ réécrit entre-temps est écarté (`fresh-advice.ts`).
2. **Ce qui a été choisi parmi l'existant part en contexte, jamais en champ.** Le sujet et la position choisis servent à juger la citation ; le modèle ne les juge pas et ne rend aucun avis dessus, puisque personne ne peut les corriger depuis ce formulaire.
3. **L'avis ne décide rien et ne laisse aucune trace.** Aucune commande ne lit ce que l'action rend ; les champs envoyés et les avis reçus ne sont ni enregistrés ni journalisés, et une panne remonte à Sentry sans eux. L'avis vit dans l'état du formulaire et meurt avec lui. Une relecture indisponible (clé absente, API en panne, session expirée) se dit en une ligne grise qui rappelle que la contribution part quand même.
4. **Pas de port ni de use case dans le domaine.** L'adaptateur (`infra/ai/proofreader.ts`, SDK Anthropic, sortie structurée décodée par un schéma Effect, règles du site en préfixe mis en cache) est appelé directement par l'action, réservée aux contributeur·ices connecté·es parce qu'un appel coûte de l'argent. Une fonction pure (`contribution-to-read.ts`) décide de ce qui part. Si un jour l'avis entre dans une décision (score de qualité, file de relecture), il entrera dans le domaine par un port à ce moment-là.
5. **Le verdict n'est jamais porté par la couleur seule.** Chaque avis a un signe et un mot (`✓ conforme`, `! à vérifier`, `✗ à corriger`), le champ le nomme par `aria-describedby`, la ligne d'état est une région vivante toujours rendue. Le jeton `--warn` est ajouté au design system pour l'ambre, entre `--ok` et `--danger`.

## Conséquences

- `ANTHROPIC_API_KEY` doit être posée en production avant tout déploiement de cette fonctionnalité ; listée dans le README.
- Le modèle est `claude-opus-5-5` à effort `low` : trois à cinq secondes par relecture, quelques dixièmes de centime l'appel, les règles servies depuis le cache dès le second appel. Aucune borne de taille ni de fréquence pour l'instant : à poser si le coût devient visible.
- Un champ modifié mais non relu (date, sigle, adresse Wikipédia) déclenche aussi une relecture à sa sortie, et cliquer sur « Ajouter » en fait partir une dernière, perdue. Accepté tant que le volume est faible.
- Les règles du site vivent dans le prompt (`RULES`), en double avec `CLAUDE.md` et le guide de contribution : à tenir à jour ensemble.
- Sans décompte dans la ligne d'état, l'arrivée d'un avis n'est pas annoncée aux lecteurs d'écran ; l'avis se découvre en revenant sur le champ.
