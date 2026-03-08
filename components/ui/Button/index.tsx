import styles from './Button.module.css'

interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  size?: 'default' | 'small'
  children: React.ReactNode
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
  target?: undefined
  rel?: undefined
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string
  type?: undefined
  onClick?: undefined
  disabled?: undefined
  target?: string
  rel?: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

export default function Button({
  variant = 'primary',
  size = 'default',
  href,
  type = 'button',
  onClick,
  disabled,
  target,
  rel,
  children,
}: ButtonProps) {
  const className = `${styles.button} ${styles[variant]} ${size === 'small' ? styles.small : ''}`

  if (href) {
    return (
      <a href={href} className={className} target={target} rel={rel}>
        {children}
      </a>
    )
  }

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
