/**
 * Adopts the drafts already there into chantiers, by subject, from a plan:
 * a JSON file that maps each chantier's title to its brief and the subject
 * titles whose drafts it gathers. Each chantier waits, agent not launched,
 * until a person starts it on /admin/chantiers.
 *
 * Usage:
 *   npm run chantiers:adopt -- docs/chantiers/reprise-2026-11-12.json             # says what it would do
 *   npm run chantiers:adopt -- docs/chantiers/reprise-2026-11-12.json --apply     # does it
 *   npm run chantiers:adopt:production -- …                                       # the same against debats.co
 *
 * Environment: DEBATS_URL (default http://localhost:3000), ADMIN_API_KEY.
 */

import { readFileSync } from 'node:fs'

type Plan = Record<string, { brief: string; subjects: string[] }>

const BASE_URL = process.env.DEBATS_URL || 'http://localhost:3000'
const KEY = process.env.ADMIN_API_KEY

async function main() {
  if (!KEY) throw new Error('ADMIN_API_KEY must be set')
  const [planPath, flag] = process.argv.slice(2)
  if (!planPath) throw new Error('Give the plan file as first argument')
  const apply = flag === '--apply'
  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as Plan

  const entries = Object.entries(plan)
  console.log(
    `${entries.length} chantiers in ${planPath}${apply ? '' : ' (dry run: add --apply to write)'}`,
  )

  for (const [title, { brief, subjects }] of entries) {
    if (!apply) {
      console.log(`- ${title}: ${subjects.length} subjects`)
      continue
    }
    const response = await fetch(`${BASE_URL}/api/chantiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ title, brief, subjects }),
    })
    const body = (await response.json()) as { id?: string; adopted?: number; error?: string }
    if (!response.ok) {
      console.log(`- ${title}: refused (${response.status}) ${body.error ?? ''}`)
      continue
    }
    console.log(`- ${title}: ${body.adopted} drafts adopted into ${body.id}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
