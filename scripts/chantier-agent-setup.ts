/**
 * Sets up, once, what a chantier needs on the Anthropic side: an environment
 * (a container with the network open), a vault holding the site's admin key
 * as an environment variable substituted at egress, and the agent itself
 * (model, system prompt, tools). Prints the ids to set on the site, never
 * the key.
 *
 * Usage:
 *   npm run chantier:setup                     # against .env.local
 *   npm run chantier:setup:production          # against .env.production, plus the Clever variables
 *
 * Environment: ANTHROPIC_API_KEY (the account the sessions run on), ADMIN_API_KEY
 * (the site's key, read from the environment and sent to the vault only),
 * DEBATS_URL (the host the key may be sent to). When CHANTIER_AGENT_ID is set,
 * the agent is updated in place (a new version) instead of created; the
 * environment and the vault are created only when their id is missing.
 */

import Anthropic from '@anthropic-ai/sdk'
import { CHANTIER_AGENT_SYSTEM } from '../infra/ai/chantier-agent-prompt'

const AGENT_NAME = 'Agent de contenu Débats.co'
const MODEL = 'claude-opus-5-5'

async function main() {
  const env = process.env
  const adminKey = env.ADMIN_API_KEY
  const siteUrl = env.DEBATS_URL
  if (!adminKey || !siteUrl) {
    throw new Error('ADMIN_API_KEY and DEBATS_URL must be set: the vault needs both')
  }
  const siteHost = new URL(siteUrl).host
  const client = new Anthropic()

  const environmentId = env.CHANTIER_ENVIRONMENT_ID || (await createEnvironment(client))
  const vaultId = env.CHANTIER_VAULT_ID || (await createVault(client, adminKey, siteHost))
  const agent = env.CHANTIER_AGENT_ID
    ? await client.beta.agents.update(env.CHANTIER_AGENT_ID, agentDefinition())
    : await client.beta.agents.create(agentDefinition())

  console.log('Variables to set on the site (Clever: never with import-vars):')
  console.log(`CHANTIER_ENVIRONMENT_ID=${environmentId}`)
  console.log(`CHANTIER_VAULT_ID=${vaultId}`)
  console.log(`CHANTIER_AGENT_ID=${agent.id}`)
  console.log(`(agent version ${agent.version})`)
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

function agentDefinition() {
  return {
    name: AGENT_NAME,
    model: MODEL,
    system: CHANTIER_AGENT_SYSTEM,
    description:
      'Travaille un chantier de Débats.co : cherche, vérifie et poste des brouillons par l’API.',
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
