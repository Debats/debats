import { Effect, pipe } from 'effect'
import { isAmong } from '../aggregates/joint-declaration'
import { DraftJointDeclaration, DraftStatement } from '../entities/draft-statement'
import { generateJointDeclarationSlug } from '../entities/joint-declaration'
import { StatementAuthor, StatementContent } from '../entities/statement'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { found } from './preconditions'
import { publishJointDeclarationUseCase } from './publish-joint-declaration'
import { toldAsOne } from './run-command'
import { signJointDeclarationUseCase } from './sign-joint-declaration'
import { takeJointPositionUseCase } from './take-joint-position'
import { ContributorIdentity, Rejected } from './types'

export const ONLY_WORDS_SIGN =
  'Seule une déclaration peut être la signature d’une déclaration commune.'
export const SIGNATURE_NOT_WRITTEN = 'La signature n’a pas donné de prise de position.'
export const NO_ARGUMENT_ON_SIGNATURE =
  'Un brouillon de signature ne porte pas d’arguments : ils s’ajoutent à la prise de position une fois publiée.'

type SignedFromDraftParams = {
  contributor: ContributorIdentity
  /** The text the draft names: found by its title, or referenced from the draft */
  text: DraftJointDeclaration
  draft: Pick<DraftStatement, 'content' | 'sourceName' | 'sourceUrl' | 'date' | 'arguments'>
  /** Who the draft says signed, the subject and the position, already found or created */
  author: StatementAuthor
  subjectId: string
  positionId: string
}

/** Read side: the text by its title, what it holds, and the statement a signature made */
const declarations = Effect.serviceFunctions(JointDeclarationRepository)
const statements = Effect.serviceFunctions(StatementRepository)

/**
 * Turns a draft that is a signature into what the site holds of the text.
 *
 * A draft speaks of one signatory and one position; a joint declaration is
 * all its signatories on all its positions. So the draft is read as three
 * things it may teach the site, each added only when the site lacks it: the
 * text itself, that it takes this position, and that this author signed it.
 * Whatever the order the drafts of a text are validated in, they converge —
 * and one that teaches nothing new still finds its statement.
 *
 * Each of the three is its own command, in its own transaction, as every
 * step of a draft's validation.
 */
export function signedFromDraft(params: SignedFromDraftParams) {
  return pipe(
    carriesNoArgument(params.draft),
    Effect.andThen(wordsOf(params.draft.content)),
    Effect.flatMap((quote) => signedInWords(params, quote)),
  )
}

/**
 * A signature is made from the text alone, so the arguments a draft carries
 * would be dropped without a word. Refused rather than lost: they are added
 * to the statement once it is published.
 */
const carriesNoArgument = (draft: Pick<DraftStatement, 'arguments'>) =>
  draft.arguments.length === 0 ? Effect.void : Effect.fail(new Rejected(NO_ARGUMENT_ON_SIGNATURE))

/** A signature says what the text says: only words can be one, never a vote or a deed */
const wordsOf = (content: StatementContent): Effect.Effect<string, Rejected> =>
  content.kind === 'declaration'
    ? Effect.succeed(content.quote)
    : Effect.fail(new Rejected(ONLY_WORDS_SIGN))

function signedInWords(params: SignedFromDraftParams, quote: string) {
  const { contributor, text, draft, author, subjectId, positionId } = params
  const taken = { positionId, quote }

  const referenced = toldAsOne(
    publishJointDeclarationUseCase({
      contributor,
      title: text.title,
      presentation: text.presentation ?? '',
      sourceName: draft.sourceName,
      sourceUrl: draft.sourceUrl,
      declaredAt: draft.date,
      positions: [taken],
    }),
  )

  /** The text takes the draft's position: already, or from now on, beside any other it takes on the subject */
  const positionTaken = (declarationId: string) =>
    Effect.flatMap(declarations.findHeld(declarationId), (held) =>
      held.positions.some((position) => position.positionId === positionId)
        ? Effect.void
        : Effect.asVoid(
            toldAsOne(takeJointPositionUseCase({ contributor, declarationId, ...taken })),
          ),
    )

  /** The author is among the signatories: already, or from now on */
  const signed = (declarationId: string) =>
    Effect.flatMap(declarations.findHeld(declarationId), (held) =>
      isAmong(held.signatories, author)
        ? Effect.void
        : Effect.asVoid(
            toldAsOne(
              signJointDeclarationUseCase({
                contributor,
                declarationId,
                author: { kind: 'existing', author },
              }),
            ),
          ),
    )

  /**
   * The text the draft speaks of, when the site knows it: by its source
   * first — the same page is the same text, whatever title the draft gives
   * it — then by its title.
   */
  const knownText = Effect.flatMap(declarations.findBySourceUrl(draft.sourceUrl), (bySource) =>
    bySource
      ? Effect.succeed(bySource)
      : declarations.findBySlug(generateJointDeclarationSlug(text.title)),
  )

  return pipe(
    knownText,
    Effect.flatMap((known) =>
      known
        ? Effect.as(positionTaken(known.id), { declarationId: known.id, created: false })
        : Effect.map(referenced, (declaration) => ({
            declarationId: declaration.id as string,
            created: true,
          })),
    ),
    Effect.tap(({ declarationId }) => signed(declarationId)),
    Effect.flatMap(({ declarationId, created }) =>
      pipe(
        statements.findSignatureId(declarationId, author, positionId),
        Effect.flatMap(found(SIGNATURE_NOT_WRITTEN)),
        Effect.map((statementId) => ({ statementId, declarationCreated: created })),
      ),
    ),
  )
}
