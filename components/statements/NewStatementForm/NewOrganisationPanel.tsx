'use client'

import { ORGANISATION_TYPES, ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { NewOrganisation } from '../../../domain/use-cases/create-organisation'
import { FieldErrors } from '../../../domain/use-cases/create-statement'
import NotorietySources, { NotorietySourcePair } from '../../forms/NotorietySources'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Select from '../../ui/Select'
import Panel from './Panel'

/** Les champs libres d'une organisation créée en place, sans ses sources */
export type OrganisationDraft = Omit<NewOrganisation, 'notorietySources'>

const TYPE_OPTIONS = [
  { value: '', label: 'Choisir un type…' },
  ...ORGANISATION_TYPES.map((type) => ({ value: type, label: ORGANISATION_TYPE_LABELS[type] })),
]

interface NewOrganisationPanelProps {
  organisation: OrganisationDraft
  onChange: (organisation: OrganisationDraft) => void
  /** Les deux sources de notoriété, en paire : leur place compte pendant la saisie */
  sources: NotorietySourcePair
  onSources: (sources: NotorietySourcePair) => void
  onCancel: () => void
  errors?: FieldErrors
}

/**
 * Une organisation créée sans quitter le formulaire.
 *
 * Mêmes règles que pour une personnalité : rien n'est écrit avant l'envoi, le
 * critère de notoriété est celui du site, et la page Wikipédia doit ici décrire
 * une organisation et non une personne — ce que la commande vérifie.
 *
 * Pas de logo : un fichier n'est pas un argument sérialisable de Server
 * Function. Il s'ajoute ensuite depuis la page de l'organisation.
 */
export default function NewOrganisationPanel({
  organisation,
  onChange,
  sources,
  onSources,
  onCancel,
  errors,
}: NewOrganisationPanelProps) {
  const withField = (field: keyof OrganisationDraft, value: string) =>
    onChange({ ...organisation, [field]: value })

  return (
    <Panel
      title="Nouvelle organisation"
      instead="choisir une organisation existante"
      onCancel={onCancel}
    >
      <TextField
        label="Nom"
        id="organisationName"
        required
        placeholder="ex : Europe Écologie Les Verts"
        value={organisation.name}
        onChange={(e) => withField('name', e.target.value)}
        error={errors?.organisationName}
      />

      <TextField
        label="Sigle (facultatif)"
        id="organisationAcronym"
        placeholder="ex : EELV"
        value={organisation.acronym}
        onChange={(e) => withField('acronym', e.target.value)}
        error={errors?.organisationAcronym}
      />

      <Select
        label="Type d’organisation"
        id="organisationType"
        required
        options={TYPE_OPTIONS}
        value={organisation.organisationType}
        onChange={(e) => withField('organisationType', e.target.value)}
        error={errors?.organisationType}
      />

      <TextArea
        label="Présentation"
        id="organisationPresentation"
        required
        rows={3}
        placeholder="Ce qu’elle est, en quelques mots factuels."
        value={organisation.presentation}
        onChange={(e) => withField('presentation', e.target.value)}
        error={errors?.organisationPresentation}
      />

      <TextField
        label="Page Wikipédia"
        id="organisationWikipediaUrl"
        type="url"
        placeholder="https://fr.wikipedia.org/wiki/…"
        value={organisation.wikipediaUrl}
        onChange={(e) => withField('wikipediaUrl', e.target.value)}
        error={errors?.organisationWikipediaUrl}
      />

      <TextField
        label="Site officiel (facultatif)"
        id="organisationWebsiteUrl"
        type="url"
        placeholder="https://…"
        value={organisation.websiteUrl}
        onChange={(e) => withField('websiteUrl', e.target.value)}
      />

      {!organisation.wikipediaUrl.trim() && (
        <NotorietySources
          who="l’organisation"
          sources={sources}
          onChange={onSources}
          error={errors?.organisationNotorietySources}
        />
      )}
    </Panel>
  )
}
