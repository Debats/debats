'use client'

import {
  parseStatementType,
  STATEMENT_TYPES,
  STATEMENT_TYPE_LABELS,
  StatementType,
  VOTE_CHOICES,
  VOTE_CHOICE_LABELS,
} from '../../../domain/entities/statement'
import { FieldErrors } from '../../../domain/use-cases/types'
import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'
import TextArea from '../../ui/TextArea'
import TextField from '../../ui/TextField'
import styles from './StatementContentFields.module.css'

interface StatementContentFieldsProps {
  value: StatementContentInput
  onChange: (fields: StatementContentInput) => void
  errors?: FieldErrors
}

const TYPE_HINTS: Record<StatementType, string> = {
  declaration: 'Des paroles prononcées, citées mot pour mot.',
  program: 'Un engagement écrit dans un document programmatique.',
  vote: 'Un scrutin : le texte soumis au vote et le sens du vote.',
  act: 'Un acte : cosignature, saisine, recours, démission…',
}

/**
 * La nature de la prise de position d'abord, puis les seuls champs qu'elle
 * appelle. Les champs des autres natures ne sont pas rendus, donc pas envoyés :
 * une citation saisie avant de basculer sur « Vote » n'est pas enregistrée,
 * c'est le domaine qui ne garde que ce que la variante nomme.
 */
export default function StatementContentFields({
  value,
  onChange,
  errors,
}: StatementContentFieldsProps) {
  const type = parseStatementType(value.statementType)
  const set = (patch: Partial<StatementContentInput>) => onChange({ ...value, ...patch })

  return (
    <>
      <div className={styles.typeField}>
        <label className={styles.label} htmlFor="statementType">
          Nature de la prise de position
        </label>
        <select
          className={styles.select}
          id="statementType"
          name="statementType"
          value={type}
          onChange={(e) => set({ statementType: e.target.value })}
        >
          {STATEMENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {STATEMENT_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
        <p className={styles.hint}>{TYPE_HINTS[type]}</p>
        {errors?.statementType && <span className={styles.error}>{errors.statementType}</span>}
      </div>

      {type === 'program' && (
        <TextField
          label="Document programmatique"
          id="document"
          name="document"
          required
          placeholder="ex : L’Avenir en commun, Programme 2027"
          value={value.document}
          onChange={(e) => set({ document: e.target.value })}
          error={errors?.document}
        />
      )}

      {(type === 'declaration' || type === 'program') && (
        <TextArea
          label="Citation"
          id="quote"
          name="quote"
          required
          placeholder="La phrase exacte, mot pour mot (10 caractères minimum)"
          rows={4}
          value={value.quote}
          onChange={(e) => set({ quote: e.target.value })}
          error={errors?.quote}
        />
      )}

      {type === 'vote' && (
        <>
          <TextField
            label="Texte soumis au vote"
            id="votedText"
            name="votedText"
            required
            placeholder="Le texte tel que le scrutin le nomme"
            value={value.votedText}
            onChange={(e) => set({ votedText: e.target.value })}
            error={errors?.votedText}
          />
          <div className={styles.typeField}>
            <span className={styles.label}>Sens du vote</span>
            <div className={styles.choices} role="radiogroup" aria-label="Sens du vote">
              {VOTE_CHOICES.map((choice) => (
                <label key={choice} className={styles.choice}>
                  <input
                    type="radio"
                    name="choice"
                    value={choice}
                    checked={value.choice === choice}
                    onChange={() => set({ choice })}
                  />
                  {VOTE_CHOICE_LABELS[choice]}
                </label>
              ))}
            </div>
            <p className={styles.hint}>
              Ne pas prendre part au vote n’est pas une position : ce n’est pas un choix ici.
            </p>
            {errors?.choice && <span className={styles.error}>{errors.choice}</span>}
          </div>
        </>
      )}

      {type === 'act' && (
        <TextField
          label="Acte"
          id="deed"
          name="deed"
          required
          placeholder="ex : Cosignature de la proposition de loi n° 575"
          value={value.deed}
          onChange={(e) => set({ deed: e.target.value })}
          error={errors?.deed}
        />
      )}
    </>
  )
}
