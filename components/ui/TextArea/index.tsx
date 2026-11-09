import FieldAdvice, { Advice } from '../FieldAdvice'
import styles from './TextArea.module.css'

interface TextAreaProps {
  label: string
  id: string
  name?: string
  required?: boolean
  placeholder?: string
  rows?: number
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  /** An opinion on what was typed, from an assisted reading: shown, never enforced */
  advice?: Advice
}

export default function TextArea({
  label,
  id,
  name,
  required = false,
  placeholder,
  rows = 5,
  defaultValue,
  value,
  onChange,
  error,
  advice,
}: TextAreaProps) {
  const adviceId = `${id}-advice`

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={`${styles.textarea} ${error ? styles.textareaError : ''} ${adviceClass(advice)}`}
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        rows={rows}
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
  if (advice?.verdict === 'warning') return styles.textareaWarning
  if (advice?.verdict === 'problem') return styles.textareaProblem
  return ''
}
