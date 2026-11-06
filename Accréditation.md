# Accréditation — qui peut faire quoi

Chaque action de contribution demande un rang minimum. La référence exécutable est la table `ACTIONS` de
[`domain/reputation/permissions.ts`](domain/reputation/permissions.ts).

Voir aussi : [Niveaux.md](Niveaux.md) (les rangs et leurs seuils) et [Réputation.md](Réputation.md) (ce que chaque acte
rapporte).

## Comment un droit est vérifié

Toute l'autorisation vit dans le domaine, jamais dans le SQL (RLS Supabase = read public, write authenticated, rien de
plus). Un use case déclare son droit comme **première étape de son pipe**, par une précondition de
[`domain/use-cases/preconditions.ts`](domain/use-cases/preconditions.ts) :

- `signedIn(contributor)` — il faut être connecté·e ;
- `allowedTo(contributor, 'edit_subject', 'modifier un sujet')` — connecté·e **et** au rang requis, sinon le refus dit
  « Vous devez être Idéaliste pour modifier un sujet » ;
- `mayPerform(action, libellé)(contributor)` — la même chose quand l'action n'est connue qu'après une lecture (c'est le
  cas de la suppression d'un sujet, dont le rang requis dépend du poids du sujet).

Un refus est un `Rejected` typé, rendu en message par `runCommand`. L'interface masque en plus les boutons par
`canPerform`, mais **ce n'est jamais elle qui tranche** : le use case refuse même si l'appel arrive directement.

## Métèque (0 point) — et donc aussi Sophiste

| Action          | Contrôlée dans        |
| --------------- | --------------------- |
| `add_statement` | `create-statement.ts` |
| `add_position`  | `create-position.ts`  |

Ajouter une prise de position sourcée et proposer une position sont ouverts dès l'inscription : c'est le cœur de la
contribution, et c'est par là qu'on gagne de quoi monter.

## Éloquent·e (1 000 points)

| Action                | Contrôlée dans                           |
| --------------------- | ---------------------------------------- |
| `add_subject`         | `create-subject.ts`                      |
| `add_personality`     | `create-public-figure.ts`                |
| `add_organisation`    | `create-organisation.ts`                 |
| `add_argument`        | `statement-arguments.ts`                 |
| `add_membership`      | `add-organisation-membership.ts`         |
| `assign_theme`        | `set-subject-themes.ts`                  |
| `assign_occupation`   | `set-public-figure-occupations.ts`       |
| `link_subjects`       | `link-subjects.ts`, `unlink-subjects.ts` |
| `invite_user`         | `invite-user.ts`                         |
| `approve_subject`     | — _(pas encore implémenté)_              |
| `approve_personality` | — _(pas encore implémenté)_              |
| `approve_position`    | — _(pas encore implémenté)_              |
| `approve_argument`    | — _(pas encore implémenté)_              |
| `reject_subject`      | — _(pas encore implémenté)_              |
| `reject_personality`  | — _(pas encore implémenté)_              |
| `reject_position`     | — _(pas encore implémenté)_              |
| `reject_argument`     | — _(pas encore implémenté)_              |

Référencer une nouvelle entité engage le site : on demande d'avoir d'abord contribué. Les huit actions
`approve_*` / `reject_*` sont le **circuit signalement / approbation**, défini mais pas encore construit : rejeter,
c'est signaler un contenu fallacieux ou hors-sujet ; seul un Idéaliste pourra ensuite le supprimer.

## Idéaliste (10 000 points)

| Action                     | Contrôlée dans                                            |
| -------------------------- | --------------------------------------------------------- |
| `edit_subject`             | `update-subject.ts`                                       |
| `edit_personality`         | `update-public-figure.ts`                                 |
| `edit_organisation`        | `update-organisation.ts`                                  |
| `edit_statement`           | `update-statement.ts`                                     |
| `edit_position`            | `update-position.ts`                                      |
| `edit_argument`            | `rename-argument.ts`                                      |
| `remove_membership`        | `remove-organisation-membership.ts`                       |
| `add_theme`                | `create-theme.ts`                                         |
| `delete_theme`             | `delete-theme.ts`                                         |
| `add_occupation`           | `create-occupation.ts`, `create-occupation-family.ts`     |
| `delete_occupation`        | `delete-occupation.ts`, `delete-occupation-family.ts`     |
| `delete_minor_subject`     | `delete-subject.ts`                                       |
| `delete_argument`          | `merge-arguments.ts` (fusionner, c'est faire disparaître) |
| `edit_theme`               | — _(aucun use case : une thématique ne se renomme pas)_   |
| `edit_occupation`          | — _(aucun use case : un métier ne se renomme pas)_        |
| `delete_minor_personality` | — _(pas de commande de suppression de personnalité)_      |
| `delete_position`          | — _(pas de commande de suppression de position)_          |

Modifier ou supprimer le travail d'autrui demande le rang de modération. Quatre droits n'ont pas encore de commande à
exercer : renommer une thématique et un métier (jamais demandé), supprimer une personnalité et une position (dans
`TODO.md`).

## Fondateur (1 000 000 points)

| Action                     | Contrôlée dans                                       |
| -------------------------- | ---------------------------------------------------- |
| `delete_major_subject`     | `delete-subject.ts`                                  |
| `admin`                    | `validate-draft.ts`, `merge-positions.ts`            |
| `delete_major_personality` | — _(pas de commande de suppression de personnalité)_ |

`admin` ouvre la relecture des brouillons (`/admin/drafts`) et la fusion de positions.

## Mineur ou majeur : le poids décide du rang

Supprimer n'est pas un droit uniforme : plus un contenu est installé sur le site, plus il faut de rang pour le faire
disparaître. C'est `delete-subject.ts` qui lit le poids du sujet **le jour où la commande est prise**, puis demande
`delete_major_subject` ou `delete_minor_subject` selon le résultat.

Aujourd'hui, `isMajorSubject` ([`domain/entities/subject.ts`](domain/entities/subject.ts)) répond qu'un sujet est
majeur s'il a **moins d'une semaine ou plus de cinq prises de position**.

> ⚠️ Cette définition est reprise telle quelle du Rails de 2015, **où elle contredisait déjà son propre commentaire** :
> `reputation.yml` annonçait « Minor subject: less than 1 week old, or less than 5 statements », soit l'inverse pour
> l'âge. Conséquence actuelle : un sujet créé hier exige le rang Fondateur pour être supprimé, alors qu'un sujet vieux
> de deux ans et sans prise de position se supprime au rang Idéaliste. À trancher avant d'étendre la notion aux
> personnalités.

Le legacy appliquait le même mécanisme aux personnalités, avec un seuil plus bas (`created_at > 1.week.ago ||
statements.size > 2`, commentaire : « Minor personality: less than 1 week old, or less than 2 statements »).

## Règles de conception

- **Pas de logique métier dans le SQL** : RLS ne porte que la sécurité de base.
- **Le droit est une étape du pipe**, pas un `if` avant le pipe : le use case est un seul `Effect`.
- **Le message d'un refus nomme l'action en français** (« Vous devez être Éloquent·e pour créer un sujet »), parce
  qu'il est lu par un humain.
- **L'interface ne filtre pas à la place du domaine** : masquer un bouton est une politesse, pas une protection.
