import { PositionOption } from '../../../app/actions/get-positions-for-subject'
import {
  ContextToRead,
  ContributionToRead,
  FieldToRead,
} from '../../../app/actions/proofread-contribution'
import { parseStatementType, StatementAuthorKind } from '../../../domain/entities/statement'
import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'
import { ExistingOrNew } from './existing-or-new'
import { FigureDraft } from './NewFigurePanel'
import { OrganisationDraft } from './NewOrganisationPanel'
import { PositionDraft } from './NewPositionPanel'
import { SubjectDraft } from './NewSubjectPanel'

/** What the form holds of an entity: the data of the shared shape, none of its actions */
type Held<Draft> = Pick<ExistingOrNew<Draft>, 'creating' | 'chosen' | 'draft'>

/** The contribution as the form holds it, at the moment a reading is asked for */
export interface WrittenContribution {
  author: {
    kind: StatementAuthorKind
    figure: Held<FigureDraft>
    organisation: Held<OrganisationDraft>
  }
  topic: {
    subject: Held<SubjectDraft>
    position: {
      creating: boolean
      chosenId: string
      options: PositionOption[]
      draft: PositionDraft
    }
  }
  content: StatementContentInput
  source: { sourceName: string; sourceUrl: string }
}

const field = (field: string, label: string, value: string): FieldToRead => ({
  field,
  label,
  value,
})

/*
 * The field names are the ids the inputs bear, which are also the names the
 * command reports faults under: advice comes back on them and finds its input.
 * The labels are for the reader, and say which entity a « Nom » belongs to.
 */
const authorFields = ({ kind, figure, organisation }: WrittenContribution['author']) => {
  if (kind === 'organisation') {
    if (!organisation.creating) return []
    return [
      field('organisationName', 'Nom de l’organisation', organisation.draft.name),
      field(
        'organisationPresentation',
        'Présentation de l’organisation',
        organisation.draft.presentation,
      ),
    ]
  }
  if (!figure.creating) return []
  return [
    field('figureName', 'Nom de la personnalité', figure.draft.name),
    field('figurePresentation', 'Présentation de la personnalité', figure.draft.presentation),
  ]
}

const topicFields = ({ subject, position }: WrittenContribution['topic']) => [
  ...(subject.creating
    ? [
        field('subjectTitle', 'Titre du sujet', subject.draft.title),
        field('subjectPresentation', 'Présentation du sujet', subject.draft.presentation),
        field('subjectProblem', 'Problématique', subject.draft.problem),
      ]
    : []),
  ...(position.creating
    ? [
        field('positionTitle', 'Titre de la position', position.draft.title),
        field('positionDescription', 'Description de la position', position.draft.description),
      ]
    : []),
]

/** The content fields the chosen nature renders: the others hold nothing the form shows */
const contentFields = (content: StatementContentInput) => {
  switch (parseStatementType(content.statementType)) {
    case 'declaration':
      return [field('quote', 'Citation', content.quote)]
    case 'program':
      return [
        field('document', 'Document programmatique', content.document),
        field('quote', 'Citation', content.quote),
      ]
    case 'vote':
      return [field('votedText', 'Texte soumis au vote', content.votedText)]
    case 'act':
      return [field('deed', 'Acte', content.deed)]
  }
}

/** What was chosen among the existing: read against, never read */
const chosenContext = ({ subject, position }: WrittenContribution['topic']): ContextToRead[] => {
  const chosenPosition = position.options.find((option) => option.id === position.chosenId)
  return [
    ...(!subject.creating && subject.chosen
      ? [{ label: 'Sujet choisi', value: subject.chosen.label }]
      : []),
    ...(!position.creating && chosenPosition
      ? [{ label: 'Position choisie', value: chosenPosition.title }]
      : []),
  ]
}

/**
 * What a reading is asked about: every field being typed, in the order the
 * form shows them, and as context what was chosen among the existing.
 *
 * A draft behind a closed panel is not being typed: it is left out, whatever
 * it holds. Empty fields go as they are; the action keeps only what says
 * something, and it is the one place that has to.
 */
export function contributionToRead(written: WrittenContribution): ContributionToRead {
  return {
    fields: [
      ...authorFields(written.author),
      ...topicFields(written.topic),
      ...contentFields(written.content),
      field('sourceName', 'Nom de la source', written.source.sourceName),
      field('sourceUrl', 'Adresse de la source', written.source.sourceUrl),
    ],
    context: chosenContext(written.topic),
  }
}
