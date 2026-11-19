import { slideFileName } from '../../../../../lib/carousel-image'
import { loadCarousel } from '../load-carousel'
import { renderSlide, SHARE_CACHE } from '../render-slide'

interface RouteContext {
  params: Promise<{ slug: string; slide: string }>
}

/**
 * One slide of the carousel of a subject, as a PNG. The share dialogue of the
 * subject page shows them all, and each can be linked as it is.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug, slide: key } = await params

  const carousel = await loadCarousel(slug)
  const index = carousel?.slides.findIndex((slide) => slide.key === key) ?? -1
  if (!carousel || index === -1) return new Response('Image introuvable', { status: 404 })

  return renderSlide(carousel.subject, carousel.slides[index], {
    'Cache-Control': SHARE_CACHE,
    'Content-Disposition': `inline; filename="${slideFileName(slug, index)}"`,
  })
}
