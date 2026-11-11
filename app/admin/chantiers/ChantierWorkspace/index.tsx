'use client'

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chantier, ChantierMessage, isOpen } from '../../../../domain/entities/chantier'
import { Sheet } from '../../../../components/ui/DialogueSheet'
import { closeChantierAction } from '../../../actions/close-chantier'
import { deleteChantierAction } from '../../../actions/delete-chantier'
import { refreshChantierAction } from '../../../actions/refresh-chantier'
import { startChantierAction } from '../../../actions/start-chantier'
import { tellChantierAction } from '../../../actions/tell-chantier'
import ChantierDialogue from '../ChantierDialogue'
import { CHANTIERS_PATH } from '../hrefs'
import styles from './ChantierWorkspace.module.css'

interface ChantierWorkspaceProps {
  chantier: Chantier
  messages: ChantierMessage[]
  /** What became of the drafts, in one line */
  tally: string
  /** The drafts of the chantier, as the server rendered them */
  children: ReactNode
}

/** How often the page asks for news while the agent works */
const POLL_MS = 6_000

/**
 * A chantier open on screen: its drafts, served by the page, and its
 * conversation, kept up to date here. While the agent works the page asks
 * for news every few seconds; a new answer opens the sheet and reloads the
 * drafts, since the agent may have posted some.
 */
export default function ChantierWorkspace({
  chantier: initial,
  messages: initialMessages,
  tally,
  children,
}: ChantierWorkspaceProps) {
  const router = useRouter()
  const [chantier, setChantier] = useState(initial)
  const [messages, setMessages] = useState(initialMessages)
  const [sheet, setSheet] = useState<Sheet>('bar')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()
  const heard = useRef(initialMessages.length)
  useEffect(() => {
    heard.current = messages.length
  }, [messages.length])

  const took = useCallback(
    (next: Chantier, all: ChantierMessage[]) => {
      const grew = all.length > heard.current
      setChantier(next)
      setMessages(all)
      if (grew) setSheet((current) => (current === 'bar' ? 'half' : current))
      if (grew || next.status !== 'working') router.refresh()
    },
    [router],
  )

  useEffect(() => {
    if (chantier.status !== 'working') return
    const poll = async () => {
      const result = await refreshChantierAction(chantier.id)
      if (!result.refreshed) {
        setError(result.message)
        return
      }
      took(result.chantier, result.messages)
    }
    const timer = setInterval(() => void poll(), POLL_MS)
    return () => clearInterval(timer)
  }, [chantier.id, chantier.status, took])

  const send = useCallback(
    async (text: string) => {
      setSending(true)
      setError(undefined)
      const result = await tellChantierAction(chantier.id, text)
      if (result.sent) {
        setChantier(result.chantier)
        setMessages((current) => [...current, ...result.messages])
      } else {
        setError(result.message)
      }
      setSending(false)
    },
    [chantier.id],
  )

  /* A close that fails may still have closed the row (the agent could not be stopped): the page rereads */
  const close = useCallback(async () => {
    setError(undefined)
    const result = await closeChantierAction(chantier.id)
    if (result.closed) {
      setChantier(result.chantier)
    } else {
      setError(result.message)
      router.refresh()
    }
  }, [chantier.id, router])

  /* The agent launched on an adopted chantier: it reads what is there, and the page starts listening */
  const start = useCallback(async () => {
    setSending(true)
    setError(undefined)
    const result = await startChantierAction(chantier.id)
    if (result.started) {
      setChantier(result.chantier)
      setSheet((current) => (current === 'bar' ? 'half' : current))
    } else {
      setError(result.message)
    }
    setSending(false)
  }, [chantier.id])

  /* Gone for good: the list is the only place left to go; a refusal is shown where it was asked */
  const remove = useCallback(async () => {
    const result = await deleteChantierAction(chantier.id)
    if (!result.deleted) throw new Error(result.message)
    router.push(CHANTIERS_PATH)
  }, [chantier.id, router])

  return (
    <div className={styles.workspace}>
      <div className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.title}>{chantier.title ?? chantier.brief}</h1>
          {chantier.title && (
            <p className={styles.brief}>
              <span className={styles.briefWho}>Votre consigne</span>
              {chantier.brief}
            </p>
          )}
          <p className={styles.count}>{tally}</p>
        </div>
        {children}
      </div>

      <ChantierDialogue
        chantier={chantier}
        messages={messages}
        sheet={sheet}
        onSheet={setSheet}
        onSend={(text) => void send(text)}
        onClose={() => void close()}
        onDelete={remove}
        onStart={() => void start()}
        sending={sending}
        open={isOpen(chantier)}
        error={error}
      />
    </div>
  )
}
