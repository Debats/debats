import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { publicFigureAuthor } from '../../../../../domain/entities/statement'
import { publicFigureRef } from '../../../../../domain/read-models/statement-author'
import {
  countStatements,
  countSubjectVoices,
  countUndefended,
  debateOnSubject,
  groupStatementsByPosition,
  groupSubjectCompany,
  latestStatedAt,
} from '../../../../../domain/services/author-on-subject'
import { loadFigureSubjectPage } from '../../../../../infra/queries/author-subject-page'
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../domain/reputation/permissions'
import {
  authorOnSubjectJsonLd,
  authorOnSubjectMetadata,
} from '../../../../../lib/author-on-subject-seo'
import ShareButton from '../../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import AuthorSubjectHero from '../../../../../components/statements/AuthorSubjectHero'
import FigureRoleLine from '../../../../../components/statements/AuthorSubjectHero/FigureRoleLine'
import AuthorPositions from '../../../../../components/statements/AuthorSubjectBlocks/AuthorPositions'
import AuthorRailCard from '../../../../../components/statements/AuthorSubjectBlocks/AuthorRailCard'
import ContributeCard from '../../../../../components/statements/AuthorSubjectBlocks/ContributeCard'
import FigureRailLines from '../../../../../components/statements/AuthorSubjectBlocks/FigureRailLines'
import NeighbourSubjects from '../../../../../components/statements/AuthorSubjectBlocks/NeighbourSubjects'
import PositionAlignment from '../../../../../components/statements/AuthorSubjectBlocks/PositionAlignment'
import SubjectDebate from '../../../../../components/statements/AuthorSubjectBlocks/SubjectDebate'
import SubjectRailCard from '../../../../../components/statements/AuthorSubjectBlocks/SubjectRailCard'
import SubjectSynthesis from '../../../../../components/statements/AuthorSubjectBlocks/SubjectSynthesis'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  const supabase = createAdminSupabaseClient()
  const [figure, subject] = await Promise.all([
    Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])
  if (!figure || !subject) return { title: 'Page introuvable' }
  return authorOnSubjectMetadata(publicFigureRef(figure), subject)
}

/**
 * Une personnalité sur un sujet : la page la mieux référencée du site.
 *
 * Un visiteur y arrive d'un moteur de recherche sans connaître ni la
 * personne ni le sujet. Elle lui donne donc, dans l'ordre : la réponse en
 * prose, les prises de position sourcées, la place de cette position dans
 * le débat, le débat entier, les sujets voisins, et de quoi contribuer.
 *
 * Les blocs sont partagés avec la page d'une organisation sur un sujet,
 * l'assemblage non : une personnalité se présente par ses métiers et ses
 * affiliations, et se compare aux membres de ses organisations comme aux
 * personnalités de ses métiers.
 */
export default async function FigureSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)

  const [figure, subject] = await Promise.all([
    Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])

  if (!figure || !subject) notFound()

  const [figureStatements, contributor] = await Promise.all([
    Effect.runPromise(statementRepo.findByPublicFigureAndSubject(figure.id, subject.id)),
    getAuthenticatedContributor(),
  ])

  const author = publicFigureRef(figure)
  const positions = groupStatementsByPosition(figureStatements)
  const hers = new Set(positions.map(({ position }) => position.id))

  // Le jour vient du bord : le domaine ne lit aucune horloge
  const page = await loadFigureSubjectPage(supabase, figure, subject, hers, new Date())
  const company = groupSubjectCompany(page.everyone, publicFigureAuthor(figure.id), hers)
  const debate = debateOnSubject(page.positions, page.everyone, hers)

  const statements = countStatements(positions)
  const voices = countSubjectVoices(page.everyone)
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_statement')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorOnSubjectJsonLd(author, subject)) }}
      />
      <AuthorSubjectHero
        author={author}
        subject={subject}
        role={<FigureRoleLine occupations={page.occupations} organisations={page.organisations} />}
        counts={{
          statements,
          positions: positions.length,
          allies: page.alignment.everyone.withAuthor,
          openPositions: page.positions.length,
        }}
        actions={<ShareButton compact title={`${figure.name} sur ${subject.title}`} />}
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <SubjectRailCard
              subject={subject}
              facts={{ positions: page.positions.length, voices, span: page.span }}
            />
            <AuthorRailCard author={author} subjects={page.subjects} statements={page.statements}>
              <FigureRailLines occupations={page.occupations} organisations={page.organisations} />
            </AuthorRailCard>
          </>
        }
      >
        <SubjectSynthesis
          authorName={author.name}
          subjectTitle={subject.title}
          statements={statements}
          positionTitles={positions.map(({ position }) => position.title)}
          allies={page.alignment.everyone.withAuthor}
          undefended={countUndefended(debate)}
          latest={latestStatedAt(positions)}
        />

        <AuthorPositions
          subjectSlug={subjectSlug}
          positions={positions}
          company={company}
          roles={page.roles}
          editHref={
            canEdit
              ? (statementId) => `/p/${slug}/s/${subjectSlug}/modifier/${statementId}`
              : undefined
          }
        />

        {positions.length > 0 && (
          <PositionAlignment
            debate={debate}
            alignment={page.alignment}
            voices={voices}
            nobodyToCompare="Aucune autre voix de ses organisations ni de ses métiers n’a encore été recensée sur ce sujet : il n’y a personne à qui comparer cette position."
          />
        )}

        <SubjectDebate subjectSlug={subjectSlug} debate={debate} />

        <NeighbourSubjects author={author} neighbours={page.neighbours} />

        <ContributeCard authorName={author.name} statements={statements} />
      </ContentWithSidebar>
    </>
  )
}
