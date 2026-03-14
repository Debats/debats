import styles from './Select.module.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  id: string
  name?: string
  options: SelectOption[]
  required?: boolean
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
}

export default function Select({
  label,
  id,
  name,
  options,
  required = false,
  defaultValue,
  value,
  onChange,
  error,
}: SelectProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        className={`${styles.select} ${error ? styles.selectError : ''}`}
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
