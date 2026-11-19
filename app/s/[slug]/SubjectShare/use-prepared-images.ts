import { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ShareSlide } from '../../../actions/list-share-slides'

async function fileOf(slide: ShareSlide): Promise<File> {
  const response = await fetch(slide.href)
  if (!response.ok) throw new Error(`Share image unavailable (${response.status}): ${slide.href}`)
  return new File([await response.blob()], slide.fileName, { type: 'image/png' })
}

/**
 * Fetches the images ahead of the click that shares them. A browser lets a
 * page open its share sheet only in answer to a gesture: fetching the files
 * between the click and the sheet can outlast that permission, so the files
 * are ready before the button is. One at a time: the server draws each image
 * when it is asked for, and a dozen drawn at once is a load no visitor should
 * put on it with one click.
 */
export function usePreparedImages() {
  const [files, setFiles] = useState<File[] | null>(null)
  const [failed, setFailed] = useState(false)

  async function prepare(slides: ShareSlide[]) {
    setFailed(false)
    try {
      const fetched: File[] = []
      for (const slide of slides) fetched.push(await fileOf(slide))
      setFiles(fetched)
    } catch (cause) {
      Sentry.captureException(cause)
      setFailed(true)
    }
  }

  return { prepare, files, failed }
}
