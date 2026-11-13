import { FigureIndexSection } from '../../domain/read-models/figure-index'

/** The id of a section on the page, shared by the bar of families and the sections */
export const figureSectionAnchor = (section: FigureIndexSection): string => {
  switch (section.kind) {
    case 'family':
      return `metier-${section.family.slug}`
    case 'others':
      return 'autres-metiers'
    case 'unassigned':
      return 'sans-metier'
  }
}

/** How the section is named on the page */
export const figureSectionName = (section: FigureIndexSection): string => {
  switch (section.kind) {
    case 'family':
      return section.family.name
    case 'others':
      return 'Autres métiers'
    case 'unassigned':
      return 'Sans métier'
  }
}
