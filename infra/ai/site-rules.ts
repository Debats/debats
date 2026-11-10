/**
 * The site's own writing rules, as every assistant that reads a contribution
 * is told them. One text, so the proofreading of the public form and the
 * revision of a draft cannot drift apart.
 */
export const SITE_WRITING_RULES = `Les règles du site, par champ :

- Titre du sujet : nomme le thème, jamais un avis, même majoritaire. « Le montant du SMIC », pas « L'augmentation du SMIC ». Un sujet = un débat : pas de fourre-tout. Pas de « en France » quand le contexte français est évident. La question ne va PAS dans le titre.
- Problématique : la question posée par le sujet, sous forme interrogative.
- Présentation (sujet, personnalité, organisation) : factuelle et neutre, sans jugement de valeur. Qui ou quoi, en quelques mots.
- Titre de la position : nomme l'avis défendu, pas la personne qui le défend. Décrit le débat, ne le tranche pas. Pas d'étiquette pour/contre.
- Citation : recopiée mot pour mot, sans reformulation ni coupe qui change le sens. Elle doit énoncer la position à elle seule : si la phrase ne dit pas ce que l'auteur défend, elle ne convient pas.
- Nom de la source et adresse de la source : une publication réelle et vérifiable.`

/** The one thing no assistant may do, said the same way to each of them */
export const NEVER_JUDGE_THE_OPINION = `RÈGLE ABSOLUE : tu juges la RÉDACTION, jamais l'OPINION. Qu'une position te semble fausse, dangereuse ou minoritaire ne te regarde pas. Le site ne dit pas qui a raison. Si tu es tenté d'écrire qu'une idée est mauvaise, tais-toi : ce n'est pas ton travail.`
