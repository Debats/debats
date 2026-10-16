'use client'

import { Switch } from 'radix-ui'
import styles from './CurrentSwitch.module.css'

interface CurrentSwitchProps {
  id: string
  occupationName: string
  current: boolean
  onChange: (current: boolean) => void
}

/** Petit interrupteur « actuel / passé » logé dans la pilule d'un métier coché. */
export default function CurrentSwitch({
  id,
  occupationName,
  current,
  onChange,
}: CurrentSwitchProps) {
  return (
    <label htmlFor={id} className={styles.control}>
      <Switch.Root
        id={id}
        checked={current}
        onCheckedChange={onChange}
        className={styles.switch}
        aria-label={`${occupationName} : encore d’actualité`}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
      <span className={styles.state}>{current ? 'actuel' : 'passé'}</span>
    </label>
  )
}
