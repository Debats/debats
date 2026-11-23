import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { publishJointDeclaration, TakenPosition } from '../aggregates/joint-declaration'
import {
  generateJointDeclarationSlug,
  JointDeclarationId,
  JointDeclarationTitle,
} from '../entities/joint-declaration'
import { runUnitOfWork } from '../events/unit-of-work'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { PositionRepository } from '../repositories/position-repository'
import { dayKey } from '../value-objects/day'
import { openStream } from './aggregate-stream'
import { jointDeclarationAggregate } from './joint-declaration-stream'
import { allowedTo, fieldsOf, found, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { today } from './today'
import { ContributorIdentity, FieldErrors, Rejected } from './types'

/** One position the text takes, as the form holds it: a position chosen, and the words quoted */
const TakenPositionInput = S.Struct({ positionId: S.String, quote: S.Trim })
export type NewTakenPosition = S.Schema.Encoded<typeof TakenPositionInput>

/**
 * A text is published on a day already reached: nobody has signed anything
 * tomorrow. Both sides are day names, so the comparison is the strings' own.
 */
const publishJointDeclarationInput = (day: Date) =>
  S.Struct({
    // The spaces around a title mean nothing: they are dropped before it is judged
    title: S.Trim.pipe(S.compose(JointDeclarationTitle)),
    presentation: S.Trim,
    sourceName: S.Trim.pipe(S.minLength(1), S.maxLength(255)),
    /** Verifiability is the promise of the site, so the link is never optional */
    sourceUrl: S.Trim.pipe(S.minLength(1)),
    declaredAt: S.String.pipe(
      S.pattern(/^\d{4}-\d{2}-\d{2}$/),
      S.filter((declaredAt) => declaredAt <= dayKey(day)),
    ),
    positions: S.Array(TakenPositionInput),
  })

/**
 * What the form of a new joint declaration sends: the fields as they were
 * typed. The action takes this type, so a field the command needs cannot be
 * left out of what the client sends.
 */
export type NewJointDeclaration = S.Schema.Encoded<ReturnType<typeof publishJointDeclarationInput>>

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 150 caractères.',
  sourceName: 'Le nom de la source est requis.',
  sourceUrl: 'Le lien vers la source est requis.',
  declaredAt: 'La date du texte doit être au format AAAA-MM-JJ et ne peut pas être dans le futur.',
}

export const JOINT_DECLARATION_TITLE_TAKEN = 'Une déclaration commune porte déjà ce titre.'
export const sourceAlreadyReferenced = (known: { title: string }) =>
  `Cette source est déjà celle de la déclaration commune « ${known.title} ».`
export const TAKEN_POSITION_NOT_FOUND = 'Une des positions sélectionnées est introuvable.'
export const TAKEN_QUOTE_TOO_SHORT =
  'Chaque position est accompagnée des mots du texte qui l’énoncent, en 10 caractères au moins.'

type PublishJointDeclarationParams = NewJointDeclaration & {
  contributor: ContributorIdentity | null
}

export type { FieldErrors }

/** Read side: the title must be free, and each position must exist */
const declarations = Effect.serviceFunctions(JointDeclarationRepository)
const positions = Effect.serviceFunctions(PositionRepository)

/** A signature quotes the text: words too short to state a position state none */
export const quoteStatesThePosition = (quote: string, field: string) =>
  quote.length >= 10 ? Effect.void : Effect.fail(new Rejected(TAKEN_QUOTE_TOO_SHORT, field))

/**
 * What the text takes position on, read from the tables: the subject of a
 * position is the position's to say, never the form's.
 */
export const takenPositionRead = (
  taken: { positionId: string; quote: string },
  /** The fields of the form a refusal is told under: the words, and the position */
  fields: { quote: string; position: string },
) =>
  pipe(
    quoteStatesThePosition(taken.quote, fields.quote),
    Effect.andThen(positions.findById(taken.positionId)),
    Effect.flatMap(found(TAKEN_POSITION_NOT_FOUND, fields.position)),
    Effect.map(
      (position): TakenPosition => ({
        subjectId: position.subjectId,
        positionId: position.id,
        quote: taken.quote,
      }),
    ),
  )

/**
 * References a text signed by several, with the positions it takes. Its
 * signatories come after, one by one (`signJointDeclarationUseCase`): this
 * command writes no statement, and earns nothing.
 */
export function publishJointDeclarationUseCase(params: PublishJointDeclarationParams) {
  const { contributor: asking, ...fields } = params
  // The command names the joint declaration: the stream exists from its first event
  const id = JointDeclarationId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(asking, 'add_joint_declaration', 'référencer une déclaration commune'),
      input: Effect.flatMap(today, (day) =>
        fieldsOf(publishJointDeclarationInput(day), FIELD_MESSAGES)(fields),
      ),
    }),
    Effect.tap(({ input }) =>
      Effect.flatMap(
        declarations.findBySlug(generateJointDeclarationSlug(input.title)),
        free(JOINT_DECLARATION_TITLE_TAKEN, 'title'),
      ),
    ),
    // A text is one page: a second text on the same source is the same text under another title
    Effect.tap(({ input }) =>
      Effect.flatMap(declarations.findBySourceUrl(input.sourceUrl), (known) =>
        known
          ? Effect.fail(new Rejected(sourceAlreadyReferenced(known), 'sourceUrl'))
          : Effect.void,
      ),
    ),
    Effect.bind('taken', ({ input }) =>
      Effect.forEach(input.positions, (taken) =>
        // The form shows its positions as one list: whatever is wrong with one is told under it
        takenPositionRead(taken, { quote: 'positions', position: 'positions' }),
      ),
    ),
    Effect.bind('published', ({ input, taken }) =>
      publishJointDeclaration({ ...input, declaredAt: new Date(input.declaredAt) }, taken),
    ),
    Effect.flatMap(({ contributor, published }) =>
      runUnitOfWork((events) =>
        openStream(jointDeclarationAggregate, events, id, published, contributor.id),
      ),
    ),
    uniqueTakenAs('title', JOINT_DECLARATION_TITLE_TAKEN),
    Effect.map(({ state }) => state.declaration),
  )
}
