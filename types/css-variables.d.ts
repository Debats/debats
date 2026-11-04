import 'react'

/**
 * Lets a `style` prop carry CSS custom properties: `style={{ '--matrix-columns': 5 }}`.
 *
 * React sets them at runtime (`style.setProperty`) but `@types/react` deliberately leaves
 * `CSSProperties` closed, so that a misspelled standard property stays an error. Opening it
 * on the `--*` pattern alone keeps that check: `widht` is still refused. Module augmentation
 * is the way csstype recommends, over an assertion at each call site.
 * See https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
 *
 * Beware: React appends no unit to a custom property, so a length needs its own ('180px').
 */
declare module 'react' {
  interface CSSProperties {
    [custom: `--${string}`]: string | number | undefined
  }
}
