import Link from 'next/link'
import styles from './ActionLink.module.css'

interface ActionLinkProps {
  href: string
  /**
   * Un lien discret, plus petit et sans graisse : sous une carte du rail
   * (« Sa page complète ») ou dans une phrase. Par défaut, le lien est un
   * appel posé seul sous un bloc de texte.
   */
  quiet?: boolean
  children: React.ReactNode
}

/**
 * Le lien d'action du site, seul porteur du soulignement de signal. Les
 * blocs l'utilisent au lieu de redéfinir la recette chacun de leur côté.
 */
export default function ActionLink({ href, quiet, children }: ActionLinkProps) {
  return (
    <Link href={href} className={quiet ? styles.quiet : styles.standalone}>
      {children}
    </Link>
  )
}
