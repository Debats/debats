import { describe, expect, it } from 'vitest'
import { chantierAgentConfig, DEFAULT_REPOSITORY_URL } from './chantier-agent-anthropic'

const set = {
  CHANTIER_AGENT_ID: 'agent_1',
  CHANTIER_ENVIRONMENT_ID: 'env_1',
  DEBATS_URL: 'https://debats.co',
}

describe('chantierAgentConfig', () => {
  it('is nothing until the agent, its environment and the site are all named', () => {
    expect(chantierAgentConfig({})).toBeNull()
    expect(chantierAgentConfig({ ...set, CHANTIER_AGENT_ID: '' })).toBeNull()
    expect(chantierAgentConfig({ ...set, DEBATS_URL: undefined })).toBeNull()
  })

  it('takes its defaults for what is not set: no vault, the public repository, twenty dollars', () => {
    expect(chantierAgentConfig(set)).toEqual({
      agentId: 'agent_1',
      environmentId: 'env_1',
      vaultIds: [],
      repositoryUrl: DEFAULT_REPOSITORY_URL,
      repositoryToken: undefined,
      siteUrl: 'https://debats.co',
      budgetCents: 2000,
    })
  })

  it('reads the vault, the repository and the budget when set', () => {
    expect(
      chantierAgentConfig({
        ...set,
        CHANTIER_VAULT_ID: 'vlt_1',
        CHANTIER_REPOSITORY_URL: 'https://github.com/x/y',
        CHANTIER_REPOSITORY_TOKEN: 'ghp',
        CHANTIER_BUDGET_CENTS: '500',
      }),
    ).toMatchObject({
      vaultIds: ['vlt_1'],
      repositoryUrl: 'https://github.com/x/y',
      repositoryToken: 'ghp',
      budgetCents: 500,
    })
  })

  it('falls back on the default budget when the one set is not a number', () => {
    expect(chantierAgentConfig({ ...set, CHANTIER_BUDGET_CENTS: 'beaucoup' })?.budgetCents).toBe(
      2000,
    )
  })
})
