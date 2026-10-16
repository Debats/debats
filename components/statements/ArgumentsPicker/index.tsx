'use client'

import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { searchArguments } from '../../../app/actions/search-arguments'
import { sameArgumentTitle } from '../../../domain/entities/argument'
import { ArgumentRef, ArgumentSuggestion } from '../../../domain/read-models/argument'
import { NewArgumentInput } from '../../../domain/use-cases/statement-arguments'
import Button from '../../ui/Button'
import styles from './ArgumentsPicker.module.css'

interface ArgumentsPickerProps {
  /** Arguments déjà mobilisés (modification d'une prise de position) */
  initialSelected?: ArgumentRef[]
  /** Message d'erreur du serveur sur ce bloc */
  error?: string
}

/** Les suggestions reçues, et pour quel terme : une réponse en retard est ignorée */
interface SearchResult {
  term: string
  suggestions: ArgumentSuggestion[]
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 250

/**
 * Étape « Arguments mobilisés » d'une prise de position : on tape, on
 * reconnaît un argument déjà recensé sur le site, ou on le crée s'il manque.
 * Les choix partent avec le formulaire parent via des champs cachés.
 */
export default function ArgumentsPicker({ initialSelected = [], error }: ArgumentsPickerProps) {
  const [selected, setSelected] = useState<ArgumentRef[]>(initialSelected)
  const [proposals, setProposals] = useState<NewArgumentInput[]>([])
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult>()
  const [draft, setDraft] = useState<NewArgumentInput>()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const term = query.trim()
  const searching = term.length >= MIN_QUERY

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (term.length < MIN_QUERY) return
    debounceRef.current = setTimeout(() => {
      searchArguments(term).then((suggestions) => setResult({ term, suggestions }))
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [term])

  const suggestions = result?.term === term ? result.suggestions : undefined
  const visibleSuggestions = (suggestions ?? []).filter((s) => !selected.some((a) => a.id === s.id))
  const alreadyKnown =
    visibleSuggestions.some((s) => sameArgumentTitle(s.title, term)) ||
    selected.some((a) => sameArgumentTitle(a.title, term)) ||
    proposals.some((p) => sameArgumentTitle(p.title, term))
  const canCreate = suggestions !== undefined && !alreadyKnown

  const reset = () => {
    setQuery('')
    setResult(undefined)
  }

  const pick = (suggestion: ArgumentSuggestion) => {
    setSelected((current) => [...current, suggestion])
    reset()
  }

  const unpick = (id: string) => {
    setSelected((current) => current.filter((a) => a.id !== id))
  }

  const startCreating = () => {
    setDraft({ title: term, description: '' })
    reset()
  }

  const confirmCreate = () => {
    if (!draft) return
    setProposals((current) => [...current, draft])
    setDraft(undefined)
  }

  const removeProposal = (index: number) => {
    setProposals((current) => current.filter((_, i) => i !== index))
  }

  /** Entrée choisit la première suggestion ou crée l'argument, sans soumettre le formulaire */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!searching) return
    const exact = visibleSuggestions.find((s) => sameArgumentTitle(s.title, term))
    if (exact) pick(exact)
    else if (canCreate) startCreating()
    else if (visibleSuggestions[0]) pick(visibleSuggestions[0])
  }

  return (
    <div className={styles.picker}>
      {selected.map((argument) => (
        <input key={argument.id} type="hidden" name="argumentIds" value={argument.id} />
      ))}
      <input type="hidden" name="newArguments" value={JSON.stringify(proposals)} />

      {(selected.length > 0 || proposals.length > 0) && (
        <ul className={styles.chosen} aria-label="Arguments retenus">
          {selected.map((argument) => (
            <li key={argument.id} className={styles.chip}>
              {argument.title}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => unpick(argument.id)}
                aria-label={`Retirer l’argument ${argument.title}`}
              >
                ×
              </button>
            </li>
          ))}
          {proposals.map((proposal, index) => (
            <li key={`${proposal.title}-${index}`} className={`${styles.chip} ${styles.chipNew}`}>
              {proposal.title}
              <span className={styles.chipTag}>nouveau</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeProposal(index)}
                aria-label={`Retirer l’argument ${proposal.title}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className={styles.draft}>
          <p className={styles.draftTitle}>
            Nouvel argument : <strong>{draft.title}</strong>
          </p>
          <textarea
            className={styles.control}
            rows={2}
            placeholder="Description facultative, pour le distinguer d’un argument proche"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            aria-label="Description de l’argument"
          />
          <div className={styles.draftActions}>
            <Button type="button" variant="secondary" size="small" onClick={confirmCreate}>
              Ajouter cet argument
            </Button>
            <Button type="button" variant="link" size="small" onClick={() => setDraft(undefined)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.search}>
          <input
            className={styles.control}
            type="text"
            placeholder="Tapez un argument, ex : Dignité de la personne"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Rechercher un argument"
            aria-autocomplete="list"
          />
          {searching && (
            <ul className={styles.suggestions} role="listbox">
              {visibleSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className={styles.suggestion}
                    onClick={() => pick(suggestion)}
                    role="option"
                    aria-selected="false"
                  >
                    <span className={styles.suggestionTitle}>{suggestion.title}</span>
                    <span className={styles.suggestionCount}>
                      {suggestion.statementsCount === 0
                        ? 'jamais mobilisé'
                        : `mobilisé ${suggestion.statementsCount} fois`}
                    </span>
                  </button>
                </li>
              ))}
              {canCreate && (
                <li>
                  <button
                    type="button"
                    className={`${styles.suggestion} ${styles.create}`}
                    onClick={startCreating}
                    role="option"
                    aria-selected="false"
                  >
                    Créer l’argument « {term} »
                  </button>
                </li>
              )}
              {suggestions === undefined && <li className={styles.hint}>Recherche…</li>}
            </ul>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
