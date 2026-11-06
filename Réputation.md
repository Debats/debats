# Réputation — le barème

Chaque acte de contribution rapporte (ou coûte) des points. Ce document est le **rappel lisible** du barème ; la
référence exécutable est la table `REWARDS` de [`domain/reputation/permissions.ts`](domain/reputation/permissions.ts),
et les libellés affichés viennent de [`domain/reputation/action-labels.ts`](domain/reputation/action-labels.ts).

Voir aussi : [Niveaux.md](Niveaux.md) (les rangs et leurs seuils) et
[Accréditation.md](Accréditation.md) (qui a le droit de faire quoi).

## Comment un gain est enregistré

Un gain n'est jamais accordé après coup : il s'écrit **dans la transaction de l'acte qu'il récompense**, sur le flux
`contributor` du bénéficiaire, sous la forme d'un événement `ReputationGranted`
([`domain/aggregates/contributor-events.ts`](domain/aggregates/contributor-events.ts)). L'acte et sa récompense sont
donc écrits ensemble ou pas du tout.

- `rewardFor(contributorId, action, related)` prend le montant **dans le barème ci-dessous** ;
- `grantOf(contributorId, action, amount, related)` nomme un montant **hors barème** (aujourd'hui le seul cas est le
  bonus d'invitation, qui dépend de la réputation de l'invitant) ;
- `grant` / `grantEach` écrivent les gains ([`domain/use-cases/reward.ts`](domain/use-cases/reward.ts)).

La projection insère la ligne dans `reputation_events`, et le trigger `trg_sync_reputation` tient
`contributors.reputation` à jour. La page `/reputation` lit cet historique.

## Gains accordés aujourd'hui

| Action                         |   Points | Accordé par                           |
| ------------------------------ | -------: | ------------------------------------- |
| `added_subject`                |       50 | `create-subject.ts`                   |
| `added_personality_validated`  |       50 | `create-public-figure.ts`             |
| `added_organisation_validated` |       50 | `create-organisation.ts`              |
| `added_statement_validated`    |       50 | `create-statement.ts`                 |
| `added_position_validated`     |       50 | `create-position.ts`                  |
| `added_argument_validated`     |       50 | `statement-arguments.ts`              |
| `linked_argument_to_statement` |        1 | `statement-arguments.ts`              |
| `added_membership`             |        5 | `add-organisation-membership.ts`      |
| `edited_subject`               |        5 | `update-subject.ts`                   |
| `edited_statement`             |        5 | `update-statement.ts`                 |
| `edited_personality`           |        5 | `update-public-figure.ts`             |
| `edited_organisation`          |        5 | `update-organisation.ts`              |
| `edited_position`              |        5 | `update-position.ts`                  |
| `invitation_accepted`          |       50 | `accept-invitation.ts` (à l'invitant) |
| `invitation_bonus`             | variable | `accept-invitation.ts` (à l'invité·e) |

`invitation_bonus` vaut `floor(réputation de l'invitant / 2)` : on démarre avec la moitié du crédit de celui ou celle
qui vous a fait entrer. C'est le seul gain hors barème.

## Gains définis mais jamais accordés

Ces montants sont dans `REWARDS` et portent une étiquette dans `action-labels.ts`, mais **aucune commande ne les
distribue aujourd'hui**. Ils décrivent des fonctionnalités à venir, pas des bugs.

| Action                                |  Points | Ce qui manque pour que ça tombe                                                              |
| ------------------------------------- | ------: | -------------------------------------------------------------------------------------------- |
| `signed_up`                           |       5 | Rien ne récompense l'inscription (le profil est créé hors journal, côté authentification)    |
| `added_subject_validated`             |     200 | Suppose le circuit d'approbation : on touche 50 à la création, 200 quand le sujet est validé |
| `validated_subject`                   |      50 | Circuit d'approbation (gain au validateur)                                                   |
| `validated_personality`               |      50 | Circuit d'approbation                                                                        |
| `validated_statement`                 |      50 | Circuit d'approbation                                                                        |
| `validated_position`                  |      50 | Circuit d'approbation                                                                        |
| `validated_argument`                  |      50 | Circuit d'approbation                                                                        |
| `subject_rejected_spam`               |   −1000 | Circuit de signalement                                                                       |
| `subject_rejected_duplicate`          |    −100 | Circuit de signalement                                                                       |
| `subject_rejected_off_topic`          |    −100 | Circuit de signalement                                                                       |
| `personality_rejected_spam`           |   −1000 | Circuit de signalement                                                                       |
| `personality_rejected_duplicate`      |    −100 | Circuit de signalement                                                                       |
| `personality_rejected_off_topic`      |    −100 | Circuit de signalement                                                                       |
| `statement_rejected`                  |    −100 | Circuit de signalement                                                                       |
| `position_rejected`                   |    −100 | Circuit de signalement                                                                       |
| `argument_rejected`                   |    −100 | Circuit de signalement                                                                       |
| `argument_to_statement_link_rejected` |    −100 | Circuit de signalement                                                                       |
| `founder`                             | 1000000 | Attribution manuelle, jamais outillée                                                        |
| `early_bird`                          |   10000 | Récompense des premiers inscrits de la bêta                                                  |
| `blogged_about`                       |    1000 | Récompense qui a écrit sur Débats.co ailleurs                                                |

Seize d'entre eux, de `added_subject_validated` à `argument_to_statement_link_rejected`, tiennent au **circuit
signalement / approbation**, qui n'existe pas encore (voir `TODO.md`). Les
trois derniers (`founder`, `early_bird`, `blogged_about`) sont des gains exceptionnels qui n'ont jamais eu d'outil
d'attribution, ni dans le Rails de 2015 ni aujourd'hui.

## Ce que le legacy avait et qui n'a plus d'objet

Le barème vient de `config/reputation.yml` du backend Rails (2015), lui-même inspiré des
[privilèges de Stack Overflow](https://stackoverflow.com/help/privileges?tab=all). Tout y a été repris, à deux
exceptions près, parce que l'entité a disparu : la table `evidences` a été fusionnée dans `statements` en mars 2026
(une prise de position porte sa source).

| Action legacy            | Points | Pourquoi elle n'existe plus             |
| ------------------------ | -----: | --------------------------------------- |
| `added_evidence_valided` |     50 | Une preuve n'est plus une entité à part |
| `evidence_is_rejected`   |   −100 | Idem                                    |

À l'inverse, huit gains ont été **ajoutés** depuis le legacy, pour des notions qui n'existaient pas en 2015 :
`added_organisation_validated`, `added_membership`, `edited_statement`, `edited_personality`, `edited_organisation`,
`edited_position`, `invitation_accepted`, `invitation_bonus`.

## Règles de conception

- **Un gain s'écrit dans la transaction de son acte**, jamais dans un second temps : pas de tâche de rattrapage, pas de
  gain orphelin.
- **Les gains s'ajoutent en fin de flux** (`appendToEnd`), sans révision attendue : deux actes simultanés d'un même
  contributeur ne se marchent jamais dessus. Les flux sont pris par ordre d'identifiant pour qu'aucune paire de
  commandes ne se verrouille en croix.
- **Un montant hors barème se nomme** (`grantOf`) plutôt que de s'ajouter en douce au barème.
- **La réputation projetée est la vérité pour les droits** : `canPerform` lit `contributors.reputation`, pas le flux à
  une révision donnée. Un droit n'est donc jamais décidé « à un instant du passé ».
