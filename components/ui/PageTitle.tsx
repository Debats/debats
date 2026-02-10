import styles from "./page-title.module.css"

interface PageTitleProps {
  children: React.ReactNode
  as?: "h1" | "h2" | "h3"
}

export default function PageTitle({ children, as: Tag = "h1" }: PageTitleProps) {
  return <Tag className={styles.pageTitle}>{children}</Tag>
}
