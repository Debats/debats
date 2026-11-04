'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ChosenFile {
  file: File
  /** The address of the file, for the preview shown next to the input */
  previewUrl: string
}

/**
 * The file a contributor chose from a file input, with the address that shows
 * it before the form is sent.
 *
 * An object URL holds its file in memory until it is revoked: someone trying
 * three photographs in a row left the first two behind until the page was left.
 * Here an address is released as soon as another file is chosen, and when the
 * form goes away — in the handler that creates it, never in an effect that
 * would run after the render that already needed it.
 */
export function useChosenFile() {
  const [chosen, setChosen] = useState<ChosenFile>()
  // The release on unmount cannot read a state its effect closed over at mount
  const latest = useRef<ChosenFile>(undefined)

  const choose = useCallback((file: File | undefined) => {
    if (latest.current) URL.revokeObjectURL(latest.current.previewUrl)
    const next = file ? { file, previewUrl: URL.createObjectURL(file) } : undefined
    latest.current = next
    setChosen(next)
  }, [])

  useEffect(
    () => () => {
      if (latest.current) URL.revokeObjectURL(latest.current.previewUrl)
    },
    [],
  )

  return { file: chosen?.file, previewUrl: chosen?.previewUrl, choose }
}
