import styles from './Button.module.css'

interface ButtonProps {
  variant?: 'primary' | 'link'
  type?: 'button' | 'submit'
  onClick?: () => void
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  type = 'button',
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]}`}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
