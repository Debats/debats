import { describe, it, expect } from 'vitest'
import { readStatementArguments, statementArgumentsOf } from './statement-arguments'

/** Ce qu'un client envoie vraiment n'a pas de type : chaque cas est du JSON possible */
const asSent = (value: unknown) => value

describe('statementArgumentsOf', () => {
  it('garde ce qui est bien formé', () => {
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

  it('rend deux tableaux vides quand rien n’arrive', () => {
    for (const sent of [undefined, null, 'des arguments', 42]) {
      expect(statementArgumentsOf(asSent(sent))).toEqual({ argumentIds: [], newArguments: [] })
    }
  })

  it('rend un tableau là où le domaine en parcourt un, quoi qu’il reçoive', () => {
    // Sans ça, le domaine faisait .filter sur une chaîne et .map sur null
    expect(statementArgumentsOf(asSent({ argumentIds: 'arg-1', newArguments: null }))).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })

  it('écarte un identifiant vide et les espaces qui l’entourent', () => {
    expect(
      statementArgumentsOf(asSent({ argumentIds: ['  arg-1  ', '', '   '], newArguments: [] })),
    ).toEqual({ argumentIds: ['arg-1'], newArguments: [] })
  })

  it('écarte un argument proposé qui n’a ni titre ni description', () => {
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

  it('lit les arguments cochés et ceux proposés', () => {
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

  it('ignore un JSON illisible plutôt que d’échouer', () => {
    expect(readStatementArguments(sent([['newArguments', '{pas du json']]))).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })

  it('rend deux tableaux vides sur un formulaire sans arguments', () => {
    expect(readStatementArguments(new FormData())).toEqual({
      argumentIds: [],
      newArguments: [],
    })
  })
})
