import styles from './FormError.module.css'

interface FormErrorProps {
  message: string
}

export default function FormError({ message }: FormErrorProps) {
  return <div className={styles.error}>{message}</div>
}
