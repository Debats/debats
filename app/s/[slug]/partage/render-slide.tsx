import { ImageResponse } from 'next/og'
import { subjectHref } from '../../../../domain/read-models/hrefs'
import { StatementAuthorRef } from '../../../../domain/read-models/statement-author'
import { CarouselSlide } from '../../../../domain/read-models/subject-carousel'
import { displayAddress } from '../../../../domain/read-models/subject-share'
import { loadAvatar, loadBrandMark, loadLogo, loadOgFonts, qrCodeOf } from '../../../../lib/og'
import { authorKey } from '../../../../domain/services/author-on-subject'
import { CALL_QR_CODE, facesOf, SLIDE_SIZE } from '../../../../lib/carousel-image'
import CarouselSlideImage from '../../../../components/og/carousel/CarouselSlideImage'
import { SITE_URL } from '../../../site'
import { SubjectCarousel } from './load-carousel'

/** The portrait or the logo of each author, by author; null where the storage has none */
async function loadFaces(authors: StatementAuthorRef[]) {
  const loaded = await Promise.all(
    authors.map(async (author) => [
      authorKey(author),
      await (author.kind === 'organisation' ? loadLogo(author.slug) : loadAvatar(author.slug)),
    ]),
  )
  return Object.fromEntries(loaded) as Record<string, string | null>
}

/** The counts move with each contribution: an image is an hour old at most */
export const SHARE_CACHE = 'public, max-age=3600'

/** One slide of a subject drawn as a PNG, with the headers its caller gives it */
export async function renderSlide(
  subject: SubjectCarousel['subject'],
  slide: CarouselSlide,
  headers: Record<string, string> = {},
): Promise<ImageResponse> {
  const url = `${SITE_URL}${subjectHref(subject.slug)}`
  const [fonts, brandMark, qrCode, faces] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    qrCodeOf(url, CALL_QR_CODE),
    loadFaces(facesOf(slide)),
  ])

  return new ImageResponse(
    <CarouselSlideImage
      slide={slide}
      chrome={{
        title: subject.title,
        problem: subject.problem,
        address: displayAddress(url),
        brandMark,
      }}
      faces={faces}
      qrCode={qrCode}
    />,
    { ...SLIDE_SIZE, fonts, headers },
  )
}
