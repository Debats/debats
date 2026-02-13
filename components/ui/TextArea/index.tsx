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
}: TextAreaProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        rows={rows}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
