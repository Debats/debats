'use client'

import { FieldErrors } from '../../../domain/use-cases/create-statement'
import { NewPublicFigure } from '../../../domain/use-cases/create-public-figure'
import NotorietySources, { NotorietySourcePair } from '../../forms/NotorietySources'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Panel from './Panel'

/**
 * Les champs libres d'une personnalité ouverte en place : ce que la commande
 * attend, moins les sources de notoriété, qui restent une paire tant qu'on les
 * saisit. Dérivé plutôt que recopié, pour qu'un champ ajouté à la commande ne
 * puisse pas manquer ici sans qu'on le voie.
 */
export type FigureDraft = Omit<NewPublicFigure, 'notorietySources'>

interface NewFigurePanelProps {
  figure: FigureDraft
  onChange: (figure: FigureDraft) => void
  /**
   * Les deux sources de notoriété, en paire et non en liste : leur place
   * compte tant qu'on les saisit, sinon ce qu'on tape dans la seconde
   * remonterait dans la première. La liste du domaine se compose à l'envoi.
   */
  sources: NotorietySourcePair
  onSources: (sources: NotorietySourcePair) => void
  onCancel: () => void
  errors?: FieldErrors
}

/**
 * Une personnalité ouverte sans quitter le formulaire.
 *
 * Rien n'est écrit ici : le panneau tient les champs que l'envoi portera, dans
 * la même transaction que la prise de position. Le critère de notoriété est le
 * même qu'ailleurs sur le site — une page Wikipédia, ou deux sources
 * indépendantes — et le bloc des sources n'apparaît que faute de page, avec le
 * rappel de pourquoi il apparaît.
 *
 * Pas de photo : un fichier n'est pas un argument sérialisable de Server
 * Function, et ce formulaire envoie un objet typé. L'avatar s'ajoute ensuite
 * depuis la page de la personnalité.
 */
export default function NewFigurePanel({
  figure,
  onChange,
  sources,
  onSources,
  onCancel,
  errors,
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
