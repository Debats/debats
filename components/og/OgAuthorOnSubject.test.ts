import { describe, it, expect } from 'vitest'
import OgAuthorOnSubject from './OgAuthorOnSubject'

const rendered = () =>
  OgAuthorOnSubject({
    authorName: 'Marc Endeweld',
    subjectTitle: 'La nationalisation des entreprises stratégiques',
    avatarSrc: null,
    shape: 'round',
    positionTitle: "Recapitalisation de l'industrie par l'État",
    quote: "Aujourd'hui, il n'y aurait plus un seul État en Europe en capacité de recapitaliser.",
  })

describe('OgAuthorOnSubject', () => {
  it('should hand the frame a single container stacking its blocks', () => {
    // Regression: the component handed the frame a fragment. The OpenGraph
    // renderer lays the children of a fragment in a row, so the identity, the
    // position and the quote overlapped and overflowed the image.
    const element = rendered()

    expect(element.type).toBe('div')
    expect(element.props.style).toMatchObject({ display: 'flex', flexDirection: 'column' })
  })
})
