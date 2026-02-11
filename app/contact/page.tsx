import { Metadata } from "next"
import PageTitle from "../../components/ui/PageTitle"
import Button from "../../components/ui/Button"
import styles from "./contact.module.css"

export const metadata: Metadata = {
  title: "Contact - Débats.co",
  description: "Contactez l'équipe Débats.co par email ou sur les réseaux sociaux.",
}

export default function ContactPage() {
  return (
    <div className={styles.container}>
      <PageTitle>Contact</PageTitle>

      <p className={styles.text}>
        Nous sommes disponibles par email.
      </p>

      <Button href="mailto:contact@debats.co">
        Courriel
      </Button>
    </div>
  )
}
