'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ShareButtonContextValue {
  hasPageShareButton: boolean
  register: () => () => void
}

const ShareButtonContext = createContext<ShareButtonContextValue>({
  hasPageShareButton: false,
  register: () => () => {},
})

export function ShareButtonProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)

  const register = useCallback(() => {
    setCount((c) => c + 1)
    return () => setCount((c) => c - 1)
  }, [])

  return (
    <ShareButtonContext.Provider value={{ hasPageShareButton: count > 0, register }}>
      {children}
    </ShareButtonContext.Provider>
  )
}

export function useShareButtonContext() {
  return useContext(ShareButtonContext)
}
