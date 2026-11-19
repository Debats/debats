'use server'

import { subjectShareSlideHref } from '../../domain/read-models/hrefs'
import { slideFileName, slideLabel } from '../../lib/carousel-image'
import { loadCarousel } from '../s/[slug]/partage/load-carousel'

/** One slide of a carousel, as the share dialogue shows and hands it over */
export interface ShareSlide {
  key: string
  /** Where its image is served */
  href: string
  /** The name the image takes on the disk or in the share sheet */
  fileName: string
  /** What it shows, in a few words */
  label: string
}

/**
 * The slides the subject offers to be shared, in the order they are swiped.
 * Asked when the dialogue opens, not when the page renders: reading every
 * statement of a subject is not something each of its visitors should pay for.
 */
export async function listShareSlides(slug: string): Promise<ShareSlide[]> {
  const carousel = await loadCarousel(slug)
  return (carousel?.slides ?? []).map((slide, index) => ({
    key: slide.key,
    href: subjectShareSlideHref(slug, slide.key),
    fileName: slideFileName(slug, index),
    label: slideLabel(slide),
  }))
}
