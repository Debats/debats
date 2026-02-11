import Image from "next/image"
import { Metadata } from "next"
import styles from "./a-propos.module.css"

export const metadata: Metadata = {
  title: "À propos - Débats.co",
  description:
    "Débats est un projet francophone et participatif, ayant pour objectif d'offrir une synthèse ouverte, impartiale et vérifiable, des sujets clivants de notre société.",
}

export default function AProposPage() {
  return (
    <>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>
          <Image
            src="/images/logo.png"
            alt="Débats"
            width={946}
            height={750}
            className={styles.heroLogo}
            priority
          />
        </h1>
        <a href="#accroche" className={styles.scrollIndicator} aria-label="Défiler vers le bas">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="29" stroke="white" strokeWidth="1.5" />
            <path d="M20 24l10 8 10-8" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M20 32l10 8 10-8" stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
        </a>
      </div>

      <div id="accroche" className={styles.accroche}>
        <p>
          <em>Débats</em> est un projet francophone et participatif, ayant pour
          objectif d&apos;offrir une synthèse ouverte, impartiale et vérifiable,
          des sujets clivants de notre société.
        </p>
      </div>

      <div className={styles.manifeste}>
        <h2 className={styles.manifesteTitle}>Pourquoi Débats ?</h2>

        <p>
          Dans un monde de plus en plus complexe, les discours simplistes sont
          légion. Régulièrement, des controverses se construisent sur la base
          d&apos;arguments à peine vérifiés, ou simplement invérifiables.
        </p>

        <p>
          L&apos;intelligibilité du débat public et son accessibilité par tous
          ceux qui aspirent à y participer déterminent la qualité de notre
          système démocratique.
        </p>

        <p>
          Or, aujourd&apos;hui, aucun outil, simple d&apos;utilisation, ne
          permet d&apos;accéder à la pluralité des idées de celles et ceux qui
          font le choix de s&apos;exprimer publiquement.
        </p>

        <p>
          Les blogs, les tweets, les journaux télévisés, les discours ou les
          livres sont un trésor démocratique laissé en jachère, une réserve
          politique fertile jusqu&apos;ici largement sous-exploitée.
        </p>

        <p>
          L&apos;ambition de <em>Débats</em> est simple : recenser, sur chaque
          grand thème qui fait débat, les prises de position de celles et ceux
          qui décident de s&apos;engager.
        </p>

        <p>
          Rédigé par des volontaires sur une plateforme en ligne, et
          fonctionnant sur le principe du wiki, <em>Débats</em> a pour objectif
          d&apos;offrir un contenu libre, impartial et vérifiable des prises de
          position.
        </p>

        <p className={styles.highlight}>
          Face à ce que nous considérons comme un dévoiement démocratique, nous
          partageons une conviction : l&apos;information est notre première
          arme.
        </p>
      </div>
    </>
  )
}
