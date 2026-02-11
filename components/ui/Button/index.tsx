import styles from './Button.module.css'

interface ButtonBaseProps {
  variant?: 'primary' | 'link'
  children: React.ReactNode
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined
  type?: 'button' | 'submit'
  onClick?: () => void
  target?: undefined
  rel?: undefined
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string
  type?: undefined
  onClick?: undefined
  target?: string
  rel?: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

export default function Button({
  variant = 'primary',
  href,
  type = 'button',
  onClick,
  target,
  rel,
  children,
}: ButtonProps) {
  const className = `${styles.button} ${styles[variant]}`

  if (href) {
    return (
      <a href={href} className={className} target={target} rel={rel}>
        {children}
      </a>
    )
  }

  return (
    <button className={className} type={type} onClick={onClick}>
      {children}
    </button>
  )
}
