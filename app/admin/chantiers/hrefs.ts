import { chantierListQuery, ChantierListView } from '../../../domain/read-models/chantier-list'

export const CHANTIERS_PATH = '/admin/chantiers'

export const chantierHref = (id: string) => `${CHANTIERS_PATH}/${id}`

/** The list of chantiers under a view: with or without the closed ones */
export const chantiersHref = (view: ChantierListView) =>
  `${CHANTIERS_PATH}${chantierListQuery(view)}`
