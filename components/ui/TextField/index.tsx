import FieldAdvice, { Advice } from '../FieldAdvice'
import styles from './TextField.module.css'

interface TextFieldProps {
  label: string
  id: string
  name?: string
  type?: 'text' | 'email' | 'password' | 'url' | 'date'
  required?: boolean
  autoComplete?: string
  placeholder?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  /** An opinion on what was typed, from an assisted reading: shown, never enforced */
  advice?: Advice
}

export default function TextField({
  label,
  id,
  name,
  type = 'text',
  required = false,
  autoComplete,
  placeholder,
  defaultValue,
  value,
  onChange,
  error,
  advice,
}: TextFieldProps) {
  const adviceId = `${id}-advice`

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={`${styles.input} ${error ? styles.inputError : ''} ${adviceClass(advice)}`}
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        aria-describedby={advice ? adviceId : undefined}
      />
      {error && <span className={styles.error}>{error}</span>}
      {advice && <FieldAdvice id={adviceId} advice={advice} />}
    </div>
  )
}

/* The border carries the verdict's colour; a field found fine keeps its own */
function adviceClass(advice?: Advice): string {
  if (advice?.verdict === 'warning') return styles.inputWarning
  if (advice?.verdict === 'problem') return styles.inputProblem
  return ''
}
