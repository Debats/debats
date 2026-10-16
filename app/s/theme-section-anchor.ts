import { ThemeSection } from '../../domain/read-models/subject-index'

/** The id of a section on the page, shared by the theme bar and the sections */
export const themeSectionAnchor = (section: ThemeSection): string =>
  `theme-${section.theme?.slug ?? 'autres'}`

/** How the section is named on the page; the themeless one has no theme to name it */
export const themeSectionName = (section: ThemeSection): string =>
  section.theme?.name ?? 'Autres sujets'
