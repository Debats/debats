import { Effect } from 'effect'
import { ContentCatalog } from '../read-models/content-catalog'
import { DatabaseError } from './errors'

export interface ContentCatalogRepository {
  /** Every live subject, position, public figure and organisation. */
  getCatalog(): Effect.Effect<ContentCatalog, DatabaseError>
}
