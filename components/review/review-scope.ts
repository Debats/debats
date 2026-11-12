import { createContext } from 'react'
import { ReviewMarks, Viewer } from '../../domain/read-models/review'

/** What a page read once for all the marks it shows: the marks themselves, and who looks at them */
export interface ReviewScopeValue {
  marks: ReviewMarks
  viewer: Viewer
}

/** Null outside a scope: a page that read no marks shows none */
export const ReviewScopeContext = createContext<ReviewScopeValue | null>(null)
