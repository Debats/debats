import Link from 'next/link'
import styles from './subject-title.module.css'

interface SubjectTitleProps {
  slug: string
  title: string
  as?: 'h2' | 'h3'
}

export default function SubjectTitle({ slug, title, as: Tag = 'h3' }: SubjectTitleProps) {
  return (
    <Tag className={styles.subjectTitle}>
      <Link href={`/subjects/${slug}`}>{title}</Link>
    </Tag>
  )
}
