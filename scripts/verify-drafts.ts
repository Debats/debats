/**
 * Checks every pending draft against its source: does the page answer, and
 * does it carry the words the draft quotes? A vote or an act has no words, so
 * only its source is checked. What a machine cannot read (a social network, a
 * video, a PDF) is left to the human review.
 *
 * Usage:
 *   npm run verify:drafts                       # report only, nothing is written
 *   npm run verify:drafts -- --apply            # sends what fails back for revision
 *   npm run verify:drafts -- --limit 50 --out report.json
 *   npm run verify:drafts:production -- …       # the same against debats.co
 *
 * Environment: ADMIN_API_KEY (required), DEBATS_URL (default http://localhost:3000)
 */

import { writeFileSync } from 'node:fs'
import { DraftStatement } from '../domain/entities/draft-statement'
import { contentLine } from '../domain/entities/statement'
import { FetchedPage, Verdict, isReadable, verdictFor } from './verify-drafts/verdict'

/** A draft as the API serialises it: the dates are strings */
type DraftPayload = Omit<DraftStatement, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

type Checked = { draft: DraftPayload; verdict: Verdict }

type Options = { apply: boolean; limit: number; out: string | null }

const CONCURRENCY = 6
const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT = 'Mozilla/5.0 (compatible; debats.co draft verifier; +https://debats.co)'

/** The verdicts a review is sent for: the words are not there, or the source is gone */
const FAILING = new Set<Verdict['kind']>(['missing', 'unreachable'])

function parseArgs(argv: string[]): Options {
  const at = (flag: string) => {
    const index = argv.indexOf(flag)
    return index === -1 ? null : (argv[index + 1] ?? null)
  }
  return {
    apply: argv.includes('--apply'),
    limit: Number(at('--limit') ?? Infinity),
    out: at('--out'),
  }
}

/** The drafts API of one site, reached with its admin key; any unexpected answer stops the run */
function draftsApi(env: NodeJS.ProcessEnv) {
  const key = env.ADMIN_API_KEY
  if (!key) throw new Error('ADMIN_API_KEY manque dans l’environnement')
  const base = (env.DEBATS_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      const method = init.method ?? 'GET'
      throw new Error(`${method} ${path} → HTTP ${response.status} : ${await response.text()}`)
    }
    return (await response.json()) as T
  }

  return {
    pending: () => call<DraftPayload[]>('/api/drafts?status=pending'),
    sendBackForRevision: (id: string, note: string) =>
      call(`/api/drafts/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status: 'revision_requested', note }),
      }),
  }
}

async function fetchPage(url: string): Promise<FetchedPage> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    const contentType = response.headers.get('content-type') ?? ''
    const body = isReadable(contentType) ? await response.text() : ''
    return { status: response.status, contentType, body }
  } catch (error) {
    return { error: causeOf(error) }
  }
}

/** What stopped the fetch, as a person would name it */
const causeOf = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error)
  if (error.name === 'TimeoutError') return 'délai dépassé'
  // undici wraps the network error: the cause names it (ENOTFOUND, ECONNREFUSED…)
  const { cause } = error as { cause?: unknown }
  return cause instanceof Error ? cause.message : error.message
}

/** Checks the drafts a few at a time, so no source sees a burst */
async function checkAll(drafts: DraftPayload[]): Promise<Checked[]> {
  const results: Checked[] = new Array(drafts.length)
  let next = 0
  const worker = async () => {
    while (next < drafts.length) {
      const index = next++
      const draft = drafts[index]
      const page = await fetchPage(draft.sourceUrl)
      results[index] = { draft, verdict: verdictFor(draft.content, draft.sourceUrl, page) }
      // A progress line is for a person watching a terminal, not for a log
      if (process.stderr.isTTY) process.stderr.write(`\r${index + 1}/${drafts.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (process.stderr.isTTY) process.stderr.write('\n')
  return results
}

const failingOf = (checked: Checked[]) => checked.filter(({ verdict }) => FAILING.has(verdict.kind))

const reasonOf = (verdict: Verdict) => ('reason' in verdict ? ` (${verdict.reason})` : '')

function printCounts(checked: Checked[]) {
  const counts = new Map<Verdict['kind'], number>()
  for (const { verdict } of checked) counts.set(verdict.kind, (counts.get(verdict.kind) ?? 0) + 1)
  console.log(`# Vérification de ${checked.length} brouillons en attente\n`)
  for (const [kind, count] of Array.from(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${kind} : ${count}`)
  }
}

/** The drafts to look at again, by subject, the subject with the most first */
function printFailing(checked: Checked[]) {
  const bySubject = new Map<string, Checked[]>()
  for (const item of failingOf(checked)) {
    const subject = item.draft.subjectTitle
    bySubject.set(subject, [...(bySubject.get(subject) ?? []), item])
  }
  for (const [subject, items] of Array.from(bySubject).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n## ${subject} — ${items.length} à revoir\n`)
    for (const { draft, verdict } of items) {
      console.log(
        `- **${draft.author.name}** · ${verdict.kind}${reasonOf(verdict)} · ${draft.sourceUrl}`,
      )
      console.log(`  ${contentLine(draft.content).slice(0, 140)} — \`${draft.id}\``)
    }
  }
}

/** What the contributor reads on the review screen, dated so a later check is told apart */
function noteFor(verdict: Verdict): string {
  const day = new Date().toLocaleDateString('fr-FR')
  const why =
    verdict.kind === 'missing'
      ? 'la citation n’apparaît pas sur la page source'
      : `la source ne répond pas${reasonOf(verdict)}`
  return `Vérification automatique du ${day} : ${why}.`
}

async function sendBack(api: ReturnType<typeof draftsApi>, checked: Checked[]) {
  const failing = failingOf(checked)
  console.log(`\nEnvoi en révision de ${failing.length} brouillons…`)
  for (const { draft, verdict } of failing) {
    await api.sendBackForRevision(draft.id, noteFor(verdict))
    console.log(`  ✓ ${draft.author.name} — ${verdict.kind}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const api = draftsApi(process.env)
  const pending = await api.pending()
  const drafts = pending.slice(0, options.limit)
  console.error(`${pending.length} brouillons en attente, ${drafts.length} vérifiés`)

  const checked = await checkAll(drafts)
  printCounts(checked)
  printFailing(checked)
  if (options.out) {
    writeFileSync(options.out, JSON.stringify(checked, null, 2))
    console.error(`Rapport écrit dans ${options.out}`)
  }
  if (options.apply) await sendBack(api, checked)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
