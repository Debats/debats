import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { getRank } from '../../domain/reputation/permissions'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import NewStatementForm from '../../components/statements/NewStatementForm'
import { StatementDraftProvider } from '../../components/statements/StatementDraft'
import StatementPreview from '../../components/statements/StatementPreview'
import styles from './nouvelle-prise-de-position.module.css'

export const metadata: Metadata = {
  title: 'Nouvelle prise de position',
  description: 'Ajouter une prise de position sourcée sur Débats.co.',
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const expectations = [
  { ok: true, text: 'Une citation exacte, datée, avec un lien vers la source d’origine.' },
  { ok: true, text: 'Une position existante quand elle correspond, plutôt qu’une nouvelle.' },
  { ok: false, text: 'Pas de reformulation ni d’interprétation dans la citation.' },
  { ok: false, text: 'Pas de source secondaire quand la source primaire est accessible.' },
]

export default async function NouvellePositionPage({ searchParams }: PageProps) {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect('/')
  }

  const params = await searchParams
  const param = (name: string): string | undefined => {
    const value = params[name]
    return typeof value === 'string' ? value : undefined
  }
  const figureId = param('figureId')
  const figureName = param('figureName')
  const organisationId = param('organisationId')
  const organisationName = param('organisationName')
  const subjectId = param('subjectId')
  const subjectTitle = param('subjectTitle')

  const initialFigure = figureId && figureName ? { id: figureId, name: figureName } : undefined
  const initialOrganisation =
    organisationId && organisationName ? { id: organisationId, name: organisationName } : undefined
  const initialAuthor = initialOrganisation ?? initialFigure
  let initialSubject: { id: string; title: string; slug?: string } | undefined
  if (subjectId && subjectTitle) {
    const supabase = createAdminSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
    initialSubject = { id: subjectId, title: subjectTitle, slug: subject?.slug }
  }

  return (
    <StatementDraftProvider
      initial={{
        authorKind: initialOrganisation ? 'organisation' : 'public_figure',
        authorName: initialAuthor?.name ?? '',
        subjectTitle: initialSubject?.title ?? '',
      }}
    >
      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <StatementPreview />
            <div className={styles.card}>
              <p className={styles.cardTitle}>Ce qui est attendu</p>
              <ul className={styles.checklist}>
                {expectations.map((item) => (
                  <li key={item.text} className={styles.checkItem}>
                    <span className={item.ok ? styles.ok : styles.ko} aria-hidden="true">
                      {item.ok ? '✓' : '✗'}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Réputation</p>
              <p className={styles.cardText}>
                Vous avez <strong>{contributor.reputation} points</strong>, vous êtes{' '}
                {getRank(contributor.reputation)}. Chaque prise de position publiée rapporte des
                points.{' '}
                <Link href="/reputation" className={styles.cardLink}>
                  Voir l’historique
                </Link>
              </p>
            </div>
          </>
        }
      >
        <header className={styles.header}>
          {initialSubject?.slug && (
            <Link href={`/s/${initialSubject.slug}`} className={styles.back}>
              ← {initialSubject.title}
            </Link>
          )}
          <h1 className={styles.title}>Nouvelle prise de position</h1>
          <p className={styles.intro}>
            Une citation datée, sa source, la position qu’elle défend : reliez une personnalité ou
            une organisation à une position sur un sujet.
          </p>
        </header>
        <NewStatementForm
          initialFigure={initialFigure}
          initialOrganisation={initialOrganisation}
          initialSubject={initialSubject}
        />
      </ContentWithSidebar>
    </StatementDraftProvider>
  )
}
