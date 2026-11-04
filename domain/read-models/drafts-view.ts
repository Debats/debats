import { StatementAuthorKind } from '../entities/statement'

/** What pending drafts are grouped by on the review page: their subject, or their author */
export type DraftGrouping = 'subject' | StatementAuthorKind

/** What the review page shows: a grouping, and the group opened when there is one */
export interface DraftsView {
  grouping: DraftGrouping
  group?: string
}

export const DRAFTS_PATH = '/admin/drafts'

export const DRAFT_GROUPINGS: DraftGrouping[] = ['subject', 'public_figure', 'organisation']

/** Value of the `par` parameter for each grouping, as the feed spells its authors */
const GROUPING_PARAMS: Record<DraftGrouping, string> = {
  subject: 'sujets',
  public_figure: 'personnalites',
  organisation: 'organisations',
}

/** Name of the parameter carrying the opened group, one per grouping */
const GROUP_PARAMS: Record<DraftGrouping, 'sujet' | 'personnalite' | 'organisation'> = {
  subject: 'sujet',
  public_figure: 'personnalite',
  organisation: 'organisation',
}

/** How a grouping is named in the interface */
const GROUPING_LABELS: Record<DraftGrouping, string> = {
  subject: 'Par sujet',
  public_figure: 'Par personnalité',
  organisation: 'Par organisation',
}

export const draftGroupingLabel = (grouping: DraftGrouping): string => GROUPING_LABELS[grouping]

/** How the whole of a grouping is named, for the way back from one group */
const GROUPING_ALL_LABELS: Record<DraftGrouping, string> = {
  subject: 'Tous les sujets',
  public_figure: 'Toutes les personnalités',
  organisation: 'Toutes les organisations',
}

export const draftGroupingAllLabel = (grouping: DraftGrouping): string =>
  GROUPING_ALL_LABELS[grouping]

/** What a group gathers, in the singular then in the plural */
const GROUPING_NOUNS: Record<DraftGrouping, readonly [string, string]> = {
  subject: ['sujet', 'sujets'],
  public_figure: ['personnalité', 'personnalités'],
  organisation: ['organisation', 'organisations'],
}

export const draftGroupingNouns = (grouping: DraftGrouping): readonly [string, string] =>
  GROUPING_NOUNS[grouping]

/** A group of pending drafts: the title or name they share, and how many there are */
export interface DraftGroup {
  label: string
  count: number
}

/** The groups these labels make, the fullest first and the ties in alphabetical order */
export function draftGroupsOf(labels: string[]): DraftGroup[] {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'),
  )
}

export interface DraftsParams {
  par?: string
  sujet?: string
  personnalite?: string
  organisation?: string
}

const groupingOf = (value: string | undefined): DraftGrouping =>
  DRAFT_GROUPINGS.find((grouping) => GROUPING_PARAMS[grouping] === value) ?? 'subject'

/** The view an address asks for; the opened group names its own grouping */
export function parseDraftsView(params: DraftsParams): DraftsView {
  for (const grouping of DRAFT_GROUPINGS) {
    const group = params[GROUP_PARAMS[grouping]]
    if (group) return { grouping, group }
  }
  return { grouping: groupingOf(params.par) }
}

/** The address of the review page for this view; the default grouping stays out of it */
export function draftsViewHref(view: DraftsView): string {
  const query = new URLSearchParams()
  if (view.group) query.set(GROUP_PARAMS[view.grouping], view.group)
  else if (view.grouping !== 'subject') query.set('par', GROUPING_PARAMS[view.grouping])
  const search = query.toString()
  return search ? `${DRAFTS_PATH}?${search}` : DRAFTS_PATH
}

/** The address of every draft of this author, or nothing when the view already shows them */
export function authorDraftsHref(
  view: DraftsView,
  author: { kind: StatementAuthorKind; name: string },
): string | undefined {
  const shown = view.grouping === author.kind && view.group === author.name
  return shown ? undefined : draftsViewHref({ grouping: author.kind, group: author.name })
}
