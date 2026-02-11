import styles from './TextField.module.css'

interface TextFieldProps {
  label: string
  id: string
  type?: 'text' | 'email' | 'password'
  required?: boolean
  autoComplete?: string
  placeholder?: string
}

export default function TextField({
  label,
  id,
  type = 'text',
  required = false,
  autoComplete,
  placeholder,
}: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={styles.input}
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  )
}
