import * as S from 'effect/Schema'
import { slugify } from '../value-objects/slug'

export const JointDeclarationId = S.String.pipe(S.brand('JointDeclarationId'))
export type JointDeclarationId = S.Schema.Type<typeof JointDeclarationId>

export const JointDeclarationSlug = S.String.pipe(
  S.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  S.brand('JointDeclarationSlug'),
)
export type JointDeclarationSlug = S.Schema.Type<typeof JointDeclarationSlug>

export const JointDeclarationTitle = S.String.pipe(
  S.minLength(3),
  S.maxLength(150),
  S.brand('JointDeclarationTitle'),
)
export type JointDeclarationTitle = S.Schema.Type<typeof JointDeclarationTitle>

/**
 * A text several personalities or organisations sign together: a tribune, a
 * manifesto, an appeal, an open letter. Signing it is taking each of the
 * positions it takes — which is why it holds no statement of its own: the
 * statements are the signatories', one per position (`domain/aggregates/joint-declaration.ts`).
 */
export const JointDeclaration = S.Struct({
  id: JointDeclarationId,
  title: JointDeclarationTitle,
  slug: JointDeclarationSlug,
  /** What the text is, in a line: its subtitle, or what it calls for */
  presentation: S.optional(S.String),
  sourceName: S.String.pipe(S.minLength(1), S.maxLength(255)),
  /** Verifiability is the promise of the site, so a source is never optional */
  sourceUrl: S.String.pipe(S.minLength(1)),
  /** The day the text was made public: every signature is dated with it */
  declaredAt: S.Date,
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type JointDeclaration = S.Schema.Type<typeof JointDeclaration>

/** A joint declaration as a page names it and links to it, from one of its signatures */
export const JointDeclarationRef = S.Struct({ id: S.String, title: S.String, slug: S.String })
export type JointDeclarationRef = S.Schema.Type<typeof JointDeclarationRef>

export const generateJointDeclarationSlug = (title: string): JointDeclarationSlug =>
  JointDeclarationSlug.make(slugify(title))
