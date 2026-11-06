# Niveaux de contributeur

Cinq rangs, donnés par le score de réputation. La référence exécutable est `Rank` et `RANK_THRESHOLDS` dans
[`domain/reputation/permissions.ts`](domain/reputation/permissions.ts) ; la page `/reputation` les affiche.

Voir aussi : [Réputation.md](Réputation.md) (ce que chaque acte rapporte) et
[Accréditation.md](Accréditation.md) (ce que chaque rang permet).

## Les rangs

| Rang           | Réputation       | Ce qu'il est                                                                                                                                       |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sophiste**   | < 0              | Score négatif. Mêmes droits qu'un nouvel arrivant, mais avec autant de points de retard à rattraper pour redevenir Métèque.                        |
| **Métèque**    | 0 à 999          | Vient d'arriver, doit encore faire ses preuves. Peut ajouter des prises de position et proposer des positions.                                     |
| **Éloquent·e** | 1 000 à 9 999    | Contributeur·rice confirmé·e. Référence de nouveaux sujets, personnalités et organisations, mobilise des arguments, invite d'autres contributeurs. |
| **Idéaliste**  | 10 000 à 999 999 | Modère. Modifie et supprime le contenu des autres, tient les taxonomies (thématiques, métiers), renomme et fusionne les arguments.                 |
| **Fondateur**  | ≥ 1 000 000      | Supprime ce qui est devenu structurant pour le site, et dispose de l'accès d'administration.                                                       |

`getRank(reputation)` rend le rang, `getNextRankThreshold(reputation)` le seuil suivant (ou `null` au sommet), et
`canPerform(reputation, action)` compare le rang atteint au rang requis par l'action.

## L'intention derrière l'échelle

Les noms et l'esprit viennent du mode d'emploi de 2015, repris sur [`/guide`](app/guide/page.tsx) :

> La contribution au site est simple. Toutefois, avant de pouvoir accéder à toutes les fonctions de référencement, de
> recension et de modification, une phase d'apprentissage est nécessaire. Pour apprendre, il faut s'exercer. Ainsi,
> pour chaque contribution au site, un nombre de points est attribué à l'utilisateur.

L'échelle est directement inspirée des [privilèges de Stack Overflow](https://stackoverflow.com/help/privileges?tab=all) :
on ne demande pas une candidature, on accumule des actes. Le corollaire est que **la perte de points est le vrai outil
de modération** : le signalement d'un contenu fallacieux fait redescendre son auteur, jusqu'au rang Sophiste. Ce
mécanisme-là n'existe pas encore (voir le circuit signalement / approbation dans `TODO.md`).

## Rangs du legacy sans équivalent

`config/reputation.yml` (Rails, 2015) définissait trois rangs de plus, qui n'ont pas été repris :

| Rang legacy           | Réputation | Pourquoi il n'existe plus                                                                           |
| --------------------- | ---------: | --------------------------------------------------------------------------------------------------- |
| `participate_in_beta` |      1 000 | Même seuil qu'Éloquent, pour « déclarer des bugs, donner son avis » : c'était un droit, pas un rang |
| `dummies`             |       −400 | Palier de miséricorde sous zéro ; aujourd'hui tout score négatif est Sophiste                       |
| `spammers`            |       −500 | Palier de bannissement de fait ; aujourd'hui aucun rang ne retire de droit                          |

Le mode d'emploi de 2015 annonçait « 5 status » mais n'en décrivait que quatre (Métèque, Éloquent, Idéaliste,
Sophiste) : le cinquième, Fondateur, n'était jamais présenté au public. Il l'est aujourd'hui dans l'échelle.

## Un point d'attention

Aucun rang ne **retire** de droit : un Sophiste a exactement les droits d'un Métèque. Le score négatif ne coûte donc
rien sur le moment, il coûte le chemin à refaire avant d'atteindre Éloquent. C'est un choix hérité du legacy (les
paliers `dummies` et `spammers` n'étaient reliés à aucune restriction), à revoir le jour où le signalement arrive :
sans restriction, un compte à −5 000 contribue comme un compte neuf.
