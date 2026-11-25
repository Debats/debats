import styles from './Button.module.css'

interface ButtonBaseProps {
  /** `inverse` : papier sur encre, pour un bouton posé sur un fond sombre */
  variant?: 'primary' | 'secondary' | 'danger' | 'link' | 'inverse'
  size?: 'default' | 'small'
  children: React.ReactNode
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
  /** Pour un bouton qui déplie : l'état et l'identifiant de ce qu'il révèle */
  'aria-expanded'?: boolean
  'aria-controls'?: string
  target?: undefined
  rel?: undefined
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string
  type?: undefined
  onClick?: undefined
  disabled?: undefined
  'aria-expanded'?: undefined
  'aria-controls'?: undefined
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
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
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
    <button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      {children}
    </button>
  )
}
