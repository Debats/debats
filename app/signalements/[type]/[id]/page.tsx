import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import PageHero from '../../../../components/layout/PageHero'
import StatementBody from '../../../../components/statements/StatementBody'
import StatementSource from '../../../../components/statements/StatementSource'
import ActionLink from '../../../../components/ui/ActionLink'
import { ENTITY_KIND_LABELS, EntityCard } from '../../../../domain/read-models/flag-queue'
import { FLAGS_HREF } from '../../../../domain/read-models/hrefs'
import { isReviewedEntity, thisEntity } from '../../../../domain/read-models/review'
import { ReviewedEntity } from '../../../../domain/aggregates/review'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import {
  describeEntities,
  loadOpenFlagsOf,
  reviewRevision,
} from '../../../../infra/queries/flag-queue'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import FlagNote from '../../FlagNote'
import { requireModerator } from '../../moderator'
import pageStyles from '../../signalements.module.css'
import SettleForm from './SettleForm'

export const metadata: Metadata = {
  title: 'Traiter un signalement',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ type: string; id: string }>
}

/** Where the entity is corrected, and what its correction makes of the flags */
function correctionOf(entity: ReviewedEntity, card: EntityCard) {
  if (card.editHref)
    return {
      href: card.editHref,
      note: 'Le signalement est fondé et l’erreur se répare. Vous passez au formulaire de modification, où vous direz que votre correction y répond : les signalements se closent à l’enregistrement.',
    }
  // An argument has no form of its own: it is renamed from the menu of its page
  if (entity.type === 'argument' && card.href)
    return {
      href: card.href,
      note: 'Le signalement est fondé et l’erreur se répare. Un argument se renomme ou se fusionne depuis le menu « Gérer » de sa page ; revenez ensuite clore le signalement ici.',
    }
  return null
}

/** One entity, the flags open on it, and what a moderator decides of them. */
export default async function SettleFlagsPage({ params }: PageProps) {
  await requireModerator()
  const entity: unknown = await params
  if (!isReviewedEntity(entity)) notFound()

  // The revision is read before the flags: one raised in between is seen as a review that moved
  const revision = await reviewRevision(entity.id)
  const supabase = createAdminSupabaseClient()
  const [flags, cards, statement] = await Promise.all([
    Effect.runPromise(loadOpenFlagsOf(supabase, entity)),
    Effect.runPromise(describeEntities(supabase, [entity])),
    entity.type === 'statement'
      ? Effect.runPromise(createStatementRepository(supabase).findById(entity.id))
      : null,
  ])
  const card = cards.get(entity.id)
  if (!card) notFound()

  return (
    <>
      <PageHero
        kicker={`Signalements · ${ENTITY_KIND_LABELS[entity.type]}`}
        title="Traiter un signalement"
      />

      <ContentWithSidebar topMargin hideLatestStatements>
        <div className={pageStyles.sections}>
          <section className={pageStyles.section}>
            <h2 className={pageStyles.sectionTitle}>Ce qui est signalé</h2>
            <div className={pageStyles.entity}>
              <p className={pageStyles.entityTitle}>
                {card.title}
                {card.detail && <span className={pageStyles.entityDetail}> {card.detail}</span>}
              </p>
              {statement && (
                <>
                  <StatementBody content={statement.content} />
                  <StatementSource statement={statement} />
                </>
              )}
              {card.href ? (
                <ActionLink href={card.href}>Voir {thisEntity(entity.type)} sur le site</ActionLink>
              ) : (
                <p>Ce contenu a quitté le site.</p>
              )}
            </div>
          </section>

          <section className={pageStyles.section}>
            <h2 className={pageStyles.sectionTitle}>Ce qui lui est reproché</h2>
            {flags.length === 0 ? (
              <p>
                Aucun signalement en cours sur ce contenu.{' '}
                <Link href={FLAGS_HREF}>Revenir aux signalements</Link>
              </p>
            ) : (
              <div className={pageStyles.flags}>
                {flags.map((flag) => (
                  <FlagNote key={flag.id} flag={flag} />
                ))}
              </div>
            )}
          </section>

          {flags.length > 0 && (
            <section className={pageStyles.section}>
              <h2 className={pageStyles.sectionTitle}>Votre décision</h2>
              <SettleForm
                entity={entity}
                revision={revision}
                correction={correctionOf(entity, card)}
                // A statement already gone with its subject is still settled as removed: its flags were right
                removable={entity.type === 'statement'}
              />
            </section>
          )}
        </div>
      </ContentWithSidebar>
    </>
  )
}
