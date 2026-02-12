import styles from './SwitchLink.module.css'

interface SwitchLinkProps {
  text: string
  linkLabel: string
  onClick: () => void
}

export default function SwitchLink({ text, linkLabel, onClick }: SwitchLinkProps) {
  return (
    <p className={styles.container}>
      {text}{' '}
      <button type="button" className={styles.link} onClick={onClick}>
        {linkLabel}
      </button>
    </p>
  )
}
