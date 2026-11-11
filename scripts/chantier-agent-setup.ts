/**
 * Sets up, once, what a chantier needs on the Anthropic side: an environment
 * (a container with the network open), a vault holding the site's admin key
 * as an environment variable substituted at egress, the skills the agent
 * works by, and the agent itself (model, system prompt, tools, skills).
 * Prints the ids to set on the site, never the key.
 *
 * Usage:
 *   npm run chantier:setup                     # against .env.local
 *   npm run chantier:setup:production          # against .env.production, plus the Clever variables
 *
 * Environment: ANTHROPIC_API_KEY (the account the sessions run on), ADMIN_API_KEY
 * (the site's key, read from the environment and sent to the vault only),
 * CHANTIER_SKILLS_DIR (a directory holding one folder per skill, outside this
 * repository: each is published as a custom skill, or as a new version of the
 * one bearing its name, and attached to the agent), DEBATS_URL only to aim at
 * another site than debats.co (the host the key may be sent to). When
 * CHANTIER_AGENT_ID is set, the agent is updated in place (a new version)
 * instead of created; the environment and the vault are created only when
 * their id is missing.
 */

import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import Anthropic, { toFile } from '@anthropic-ai/sdk'
import { CHANTIER_AGENT_SYSTEM } from '../infra/ai/chantier-agent-prompt'
import { SITE_URL } from '../app/site'

const AGENT_NAME = 'Agent de contenu Débats.co'
const MODEL = 'claude-opus-5-5'
/** The skills the system prompt names, each a folder of CHANTIER_SKILLS_DIR */
const SKILLS = [
  'debats-agent',
  'contribution-pipeline',
  'find-subject-positions',
  'find-figure-positions',
  'find-organisation-positions',
  'extract-positions-from-media',
]

async function main() {
  const env = process.env
  const adminKey = env.ADMIN_API_KEY
  if (!adminKey) throw new Error('ADMIN_API_KEY must be set: the vault holds it')
  const siteHost = new URL(env.DEBATS_URL || SITE_URL).host
  const client = new Anthropic()

  const environmentId = env.CHANTIER_ENVIRONMENT_ID || (await createEnvironment(client))
  const vaultId = env.CHANTIER_VAULT_ID || (await createVault(client, adminKey, siteHost))
  const skillIds = env.CHANTIER_SKILLS_DIR
    ? await publishSkills(client, env.CHANTIER_SKILLS_DIR)
    : []
  if (skillIds.length === 0) console.warn('CHANTIER_SKILLS_DIR is not set: the agent has no skills')
  const definition = agentDefinition(skillIds)
  const agent = env.CHANTIER_AGENT_ID
    ? await client.beta.agents.update(env.CHANTIER_AGENT_ID, definition)
    : await client.beta.agents.create(definition)

  console.log('Variables to set on the site (Clever: never with import-vars):')
  console.log(`CHANTIER_ENVIRONMENT_ID=${environmentId}`)
  console.log(`CHANTIER_VAULT_ID=${vaultId}`)
  console.log(`CHANTIER_AGENT_ID=${agent.id}`)
  console.log(`(agent version ${agent.version}, ${skillIds.length} skills)`)
}

/** Each named skill, published from its folder: a new version when the account already has one by that name */
async function publishSkills(client: Anthropic, skillsDir: string): Promise<string[]> {
  const existing = new Map<string, string>()
  for await (const skill of client.skills.list({ source: 'custom' })) {
    existing.set(skill.display_name, skill.id)
  }
  const ids: string[] = []
  for (const name of SKILLS) {
    const folder = join(skillsDir, name)
    const files = await Promise.all(
      (await filesUnder(folder)).map((path) =>
        toFile(createReadStream(path), join(name, relative(folder, path))),
      ),
    )
    if (!files.some((file) => file.name === join(name, 'SKILL.md'))) {
      throw new Error(`${folder} has no SKILL.md`)
    }
    const known = existing.get(name)
    if (known) {
      const version = await client.skills.versions.create(known, { files })
      console.log(`Skill ${name}: version ${version.id} of ${known}`)
      ids.push(known)
    } else {
      const skill = await client.skills.create({ files, display_name: name })
      console.log(`Skill ${name}: created ${skill.id}`)
      ids.push(skill.id)
    }
  }
  return ids
}

/** Every file under a folder, recursively, as absolute paths */
async function filesUnder(folder: string): Promise<string[]> {
  const entries = await readdir(folder)
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(folder, entry)
      return (await stat(path)).isDirectory() ? filesUnder(path) : [path]
    }),
  )
  return nested.flat()
}

/** The sandbox: the network open, since sources are anywhere; packages allowed for the scripts */
async function createEnvironment(client: Anthropic): Promise<string> {
  const environment = await client.beta.environments.create({
    name: 'debats-chantiers',
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  })
  console.log(`Environment created: ${environment.id}`)
  return environment.id
}

/** The admin key, substituted at egress into the Authorization header, for the site's host only */
async function createVault(client: Anthropic, adminKey: string, siteHost: string): Promise<string> {
  const vault = await client.beta.vaults.create({ display_name: 'debats-chantiers' })
  await client.beta.vaults.credentials.create(vault.id, {
    display_name: 'ADMIN_API_KEY de Débats.co',
    auth: {
      type: 'environment_variable',
      secret_name: 'ADMIN_API_KEY',
      secret_value: adminKey,
      networking: { type: 'limited', allowed_hosts: [siteHost] },
      injection_location: { header: true, body: false },
    },
  })
  console.log(`Vault created: ${vault.id}`)
  return vault.id
}

function agentDefinition(skillIds: string[]) {
  return {
    name: AGENT_NAME,
    model: MODEL,
    system: CHANTIER_AGENT_SYSTEM,
    description:
      'Travaille un chantier de Débats.co : cherche, vérifie et poste des brouillons par l’API.',
    skills: skillIds.map((skill_id) => ({ type: 'custom' as const, skill_id })),
    tools: [
      {
        type: 'agent_toolset_20260401' as const,
        default_config: { enabled: true, permission_policy: { type: 'always_allow' as const } },
        configs: [
          { name: 'web_search' as const, enabled: true },
          { name: 'web_fetch' as const, enabled: true },
        ],
      },
    ],
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
