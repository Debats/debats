'use client'

import { FieldErrors } from '../../../domain/use-cases/create-statement'
import { NewPublicFigure } from '../../../domain/use-cases/create-public-figure'
import NotorietySources, { NotorietySourcePair } from '../../forms/NotorietySources'
import WikipediaFill from '../../forms/WikipediaFill'
import { AdviceByField } from '../../ui/FieldAdvice'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Panel from './Panel'

/**
 * The free fields of a personality created in place: what the command expects,
 * minus the notoriety sources, which stay a pair while they are being typed.
 * Derived rather than copied, so that a field added to the command cannot go
 * missing here without being noticed.
 */
export type FigureDraft = Omit<NewPublicFigure, 'notorietySources'>

interface NewFigurePanelProps {
  figure: FigureDraft
  onChange: (figure: FigureDraft) => void
  /**
   * The two notoriety sources, as a pair and not as a list: their place
   * matters while they are being typed, or what is typed in the second would
   * move up into the first. The domain's list is composed on submission.
   */
  sources: NotorietySourcePair
  onSources: (sources: NotorietySourcePair) => void
  onCancel: () => void
  errors?: FieldErrors
  advice?: AdviceByField
}

/**
 * A personality created without leaving the form.
 *
 * Nothing is written here: the panel holds the fields the submission will
 * carry, in the same transaction as the statement. The notoriety criterion is
 * the one used everywhere else on the site — a Wikipedia page, or two
 * independent sources — and the sources block appears only for want of a
 * page, with the reminder of why it appeared.
 *
 * No photo: a file is not a serialisable argument of a Server Function, and
 * this form sends a typed object. The avatar is added afterwards, from the
 * personality's own page.
 */
export default function NewFigurePanel({
  figure,
  onChange,
  sources,
  onSources,
  onCancel,
  errors,
  advice,
}: NewFigurePanelProps) {
  const withField = (field: keyof FigureDraft, value: string) =>
    onChange({ ...figure, [field]: value })

  return (
    <Panel
      title="Nouvelle personnalité"
      instead="choisir une personnalité existante"
      onCancel={onCancel}
    >
      <TextField
        label="Nom"
        id="figureName"
        required
        placeholder="ex : Marine Tondelier"
        value={figure.name}
        onChange={(e) => withField('name', e.target.value)}
        error={errors?.figureName}
        advice={advice?.figureName}
      />

      <TextArea
        label="Présentation"
        id="figurePresentation"
        required
        rows={3}
        placeholder="Qui elle est, en quelques mots factuels."
        value={figure.presentation}
        onChange={(e) => withField('presentation', e.target.value)}
        error={errors?.figurePresentation}
        advice={advice?.figurePresentation}
      />

      <TextField
        label="Page Wikipédia"
        id="figureWikipediaUrl"
        type="url"
        placeholder="https://fr.wikipedia.org/wiki/…"
        value={figure.wikipediaUrl}
        onChange={(e) => withField('wikipediaUrl', e.target.value)}
        error={errors?.figureWikipediaUrl}
      />

      <WikipediaFill
        url={figure.wikipediaUrl}
        onFilled={({ name, presentation }) => onChange({ ...figure, name, presentation })}
      />

      <TextField
        label="Site officiel (facultatif)"
        id="figureWebsiteUrl"
        type="url"
        placeholder="https://…"
        value={figure.websiteUrl}
        onChange={(e) => withField('websiteUrl', e.target.value)}
      />

      {!figure.wikipediaUrl.trim() && (
        <NotorietySources
          who="la personnalité"
          sources={sources}
          onChange={onSources}
          error={errors?.figureNotorietySources}
        />
      )}
    </Panel>
  )
}
