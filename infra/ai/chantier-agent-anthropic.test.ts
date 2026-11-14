import { describe, expect, it } from 'vitest'
import {
  chantierAgentConfig,
  DEFAULT_REPOSITORY_URL,
  refusedAtBudget,
} from './chantier-agent-anthropic'

const set = {
  CHANTIER_AGENT_ID: 'agent_1',
  CHANTIER_ENVIRONMENT_ID: 'env_1',
}

describe('refusedAtBudget', () => {
  const refusal = (status: number, message: string) => Object.assign(new Error(message), { status })

  it('knows the refusal of a session that met its cap', () => {
    const error = refusal(
      400,
      '400 {"type":"error","error":{"type":"invalid_request_error","message":"session budget reached: consumed list cost has met `budget.max_list_cost`; only `user.tool_confirmation`, `user.tool_result`, `user.custom_tool_result`, and `user.interrupt` are accepted"}}',
    )
    expect(refusedAtBudget(error)).toBe(true)
  })

  it('does not take another refusal for it', () => {
    expect(refusedAtBudget(refusal(400, '400 session is awaiting a tool confirmation'))).toBe(false)
  })

  it('does not take a failure that is not a refusal for it', () => {
    expect(refusedAtBudget(refusal(500, 'session budget reached'))).toBe(false)
    expect(refusedAtBudget(new Error('session budget reached'))).toBe(false)
    expect(refusedAtBudget('session budget reached')).toBe(false)
    expect(refusedAtBudget(null)).toBe(false)
  })
})

describe('chantierAgentConfig', () => {
  it('is nothing until the agent and its environment are both named', () => {
    expect(chantierAgentConfig({})).toBeNull()
    expect(chantierAgentConfig({ ...set, CHANTIER_AGENT_ID: '' })).toBeNull()
    expect(chantierAgentConfig({ ...set, CHANTIER_ENVIRONMENT_ID: undefined })).toBeNull()
  })

  it('points the agent at another site when DEBATS_URL says so', () => {
    expect(chantierAgentConfig({ ...set, DEBATS_URL: 'http://localhost:3000' })?.siteUrl).toBe(
      'http://localhost:3000',
    )
  })

  it('takes its defaults for what is not set: no vault, the public repository, the site, twenty dollars', () => {
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
