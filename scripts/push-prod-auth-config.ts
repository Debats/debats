/**
 * Push auth configuration to Supabase production.
 *
 * This script exists because `supabase config push` would overwrite production
 * with local dev values (localhost URLs, no email confirmation, 1s rate limit…).
 * Instead, the production auth config is declared explicitly here and pushed
 * via the Supabase Management API.
 *
 * Usage:
 *   npm run supabase:config:push          # interactive (shows diff, asks confirmation)
 *   npm run supabase:config:push -- --yes # skip confirmation
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(__dirname, '..', 'supabase', 'templates')

function readTemplate(filename: string): string {
  return readFileSync(join(templatesDir, filename), 'utf-8')
}

// ---------------------------------------------------------------------------
// Production auth config — hardcoded intentionally for auditability
// ---------------------------------------------------------------------------

const prodAuthConfig: Record<string, unknown> = {
  // URLs
  site_url: 'https://debats.co/',
  uri_allow_list: 'https://debats.co/api/auth/callback',

  // Auth behavior
  mailer_autoconfirm: false,
  disable_signup: false,
  security_update_password_require_reauthentication: false,
  mailer_secure_email_change_enabled: true,
  password_min_length: 6,

  // Email OTP
  mailer_otp_exp: 86400, // 24h
  mailer_otp_length: 8,
  smtp_max_frequency: 60, // 1 email/minute

  // Email subjects
  mailer_subjects_confirmation: 'Confirmez votre inscription sur Débats.co',
  mailer_subjects_invite: 'Vous êtes invité·e sur Débats.co',
  mailer_subjects_magic_link: 'Votre lien de connexion — Débats.co',
  mailer_subjects_recovery: 'Réinitialisation de votre mot de passe — Débats.co',
  mailer_subjects_email_change: "Changement d'adresse e-mail — Débats.co",
  mailer_subjects_reauthentication: 'Code de vérification — Débats.co',

  // Email templates — read from supabase/templates/*.html
  mailer_templates_confirmation_content: readTemplate('confirm.html'),
  mailer_templates_invite_content: readTemplate('invite.html'),
  mailer_templates_magic_link_content: readTemplate('magic-link.html'),
  mailer_templates_recovery_content: readTemplate('reset-password.html'),
  mailer_templates_email_change_content: readTemplate('change-email.html'),
  mailer_templates_reauthentication_content: readTemplate('reauthentication.html'),
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const accessToken = process.env.SUPABASE_ACCESS_TOKEN
const projectId = process.env.SUPABASE_PROJECT_ID

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Set it in .env.production.')
  process.exit(1)
}
if (!projectId) {
  console.error('Missing SUPABASE_PROJECT_ID. Set it in .env.production.')
  process.exit(1)
}

const apiBase = `https://api.supabase.com/v1/projects/${projectId}/config/auth`
const headers = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Keys we care about — ignore the rest of the remote config for the diff. */
const trackedKeys = Object.keys(prodAuthConfig)

type AuthConfig = Record<string, unknown>

function pickTracked(config: AuthConfig): AuthConfig {
  const picked: AuthConfig = {}
  for (const key of trackedKeys) {
    if (key in config) picked[key] = config[key]
  }
  return picked
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' && value.length > 80) {
    return `"${value.slice(0, 77)}…" (${value.length} chars)`
  }
  return JSON.stringify(value)
}

function printDiff(current: AuthConfig, expected: AuthConfig): boolean {
  let hasChanges = false
  for (const key of trackedKeys) {
    const currentVal = current[key]
    const expectedVal = expected[key]
    if (JSON.stringify(currentVal) !== JSON.stringify(expectedVal)) {
      hasChanges = true
      console.log(`  ${key}:`)
      console.log(`    current:  ${formatValue(currentVal)}`)
      console.log(`    expected: ${formatValue(expectedVal)}`)
      console.log()
    }
  }
  return hasChanges
}

async function confirm(message: string): Promise<boolean> {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const autoConfirm = process.argv.includes('--yes')

  // 1. Fetch current remote config
  console.log('Fetching current auth config from production…\n')
  const getRes = await fetch(apiBase, { headers })
  if (!getRes.ok) {
    console.error(`Failed to fetch config: ${getRes.status} ${await getRes.text()}`)
    process.exit(1)
  }
  const remoteConfig: AuthConfig = await getRes.json()
  const remoteTracked = pickTracked(remoteConfig)

  // 2. Show diff
  console.log('Diff (remote → local):\n')
  const hasChanges = printDiff(remoteTracked, prodAuthConfig)

  if (!hasChanges) {
    console.log('  (no changes)\n')
    console.log('Production config is already up to date.')
    return
  }

  // 3. Confirm
  if (!autoConfirm) {
    const ok = await confirm('Push these changes to production?')
    if (!ok) {
      console.log('Aborted.')
      return
    }
  }

  // 4. Push
  console.log('\nPushing auth config to production…')
  const patchRes = await fetch(apiBase, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(prodAuthConfig),
  })

  if (!patchRes.ok) {
    console.error(`Failed to push config: ${patchRes.status} ${await patchRes.text()}`)
    process.exit(1)
  }

  console.log('Done. Auth config updated successfully.')

  // 5. Verify
  const verifyRes = await fetch(apiBase, { headers })
  if (!verifyRes.ok) {
    console.warn(`Verification fetch failed: ${verifyRes.status} ${await verifyRes.text()}`)
    return
  }
  const updated: AuthConfig = await verifyRes.json()
  const updatedTracked = pickTracked(updated)
  const stillDiff = printDiff(updatedTracked, prodAuthConfig)
  if (!stillDiff) {
    console.log('Verification: all values match.')
  } else {
    console.warn('Warning: some values still differ after push.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
