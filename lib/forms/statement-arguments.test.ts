import { describe, it, expect } from 'vitest'
import { readStatementArguments, statementArgumentsOf } from './statement-arguments'

/** What a client actually sends has no type: each case below is possible JSON */
const asSent = (value: unknown) => value

describe('statementArgumentsOf', () => {
  it('keeps what is well formed', () => {
    expect(
      statementArgumentsOf(
        asSent({
          argumentIds: ['arg-1', 'arg-2'],
          newArguments: [{ title: 'Liberté de choix', description: 'Chacun décide.' }],
        }),
      ),
    ).toEqual({
      argumentIds: ['arg-1', 'arg-2'],
      newArguments: [{ title: 'Liberté de choix', description: 'Chacun décide.' }],
    })
  })

  it('returns two empty arrays when nothing arrives', () => {
    for (const sent of [undefined, null, 'some arguments', 42]) {
      expect(statementArgumentsOf(asSent(sent))).toEqual({ argumentIds: [], newArguments: [] })
    }
  })

  it('returns an array wherever the domain walks one, whatever it receives', () => {
    // Without this, the domain ran .filter on a string and .map on null
    expect(statementArgumentsOf(asSent({ argumentIds: 'arg-1', newArguments: null }))).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })

  it('drops an empty id and the spaces around the ones it keeps', () => {
    expect(
      statementArgumentsOf(asSent({ argumentIds: ['  arg-1  ', '', '   '], newArguments: [] })),
    ).toEqual({ argumentIds: ['arg-1'], newArguments: [] })
  })

  it('drops a proposed argument that has neither title nor description', () => {
    expect(
      statementArgumentsOf(
        asSent({
          argumentIds: [],
          newArguments: [
            { title: 'Dignité', description: 'Celle de la personne.' },
            { title: 'Seul' },
            null,
            'texte',
          ],
        }),
      ),
    ).toEqual({
      argumentIds: [],
      newArguments: [{ title: 'Dignité', description: 'Celle de la personne.' }],
    })
  })
})

describe('readStatementArguments', () => {
  const sent = (entries: [string, string][]) => {
    const fields = new FormData()
    for (const [name, value] of entries) fields.append(name, value)
    return fields
  }

  it('reads the ticked arguments and the proposed ones', () => {
    expect(
      readStatementArguments(
        sent([
          ['argumentIds', 'arg-1'],
          ['argumentIds', 'arg-2'],
          ['newArguments', '[{"title":"Liberté","description":"Chacun décide."}]'],
        ]),
      ),
    ).toEqual({
      argumentIds: ['arg-1', 'arg-2'],
      newArguments: [{ title: 'Liberté', description: 'Chacun décide.' }],
    })
  })

  it('ignores unreadable JSON rather than fail', () => {
    expect(readStatementArguments(sent([['newArguments', '{not json']]))).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })

  it('returns two empty arrays for a form with no arguments', () => {
    expect(readStatementArguments(new FormData())).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })
})
