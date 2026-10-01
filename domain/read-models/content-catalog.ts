/**
 * Read model for the content catalog: everything an automated contributor needs
 * to reuse existing entities instead of creating near-duplicates.
 *
 * Drafts are matched against existing entities by slug at validation time
 * (see `validate-draft`), so the catalog exposes both the slug and the exact
 * wording to reuse.
 */

export interface CatalogPosition {
  slug: string
  title: string
}

export interface CatalogSubject {
  slug: string
  title: string
  positions: CatalogPosition[]
}

export interface CatalogPublicFigure {
  slug: string
  name: string
}

export interface CatalogOrganisation {
  slug: string
  name: string
  acronym: string | null
}

export interface ContentCatalog {
  subjects: CatalogSubject[]
  publicFigures: CatalogPublicFigure[]
  organisations: CatalogOrganisation[]
}

/** Flat rows read from the database, before assembly. */
export interface ContentCatalogRows {
  subjects: Array<{ id: string; slug: string; title: string }>
  positions: Array<{ id: string; subjectId: string; slug: string; title: string }>
  publicFigures: Array<{ id: string; slug: string; name: string }>
  organisations: Array<{ id: string; slug: string; name: string; acronym: string | null }>
}

const byLabel = (a: string, b: string) => a.localeCompare(b, 'fr')

/** Assembles flat rows into the nested, alphabetically ordered catalog. */
export function buildContentCatalog(rows: ContentCatalogRows): ContentCatalog {
  const positionsBySubjectId = new Map<string, CatalogPosition[]>()
  for (const position of rows.positions) {
    const positions = positionsBySubjectId.get(position.subjectId) ?? []
    positions.push({ slug: position.slug, title: position.title })
    positionsBySubjectId.set(position.subjectId, positions)
  }

  return {
    subjects: rows.subjects
      .map((subject) => ({
        slug: subject.slug,
        title: subject.title,
        positions: (positionsBySubjectId.get(subject.id) ?? []).sort((a, b) =>
          byLabel(a.title, b.title),
        ),
      }))
      .sort((a, b) => byLabel(a.title, b.title)),
    publicFigures: rows.publicFigures
      .map((figure) => ({ slug: figure.slug, name: figure.name }))
      .sort((a, b) => byLabel(a.name, b.name)),
    organisations: rows.organisations
      .map((organisation) => ({
        slug: organisation.slug,
        name: organisation.name,
        acronym: organisation.acronym,
      }))
      .sort((a, b) => byLabel(a.name, b.name)),
  }
}
