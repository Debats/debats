import initStoryshots, { multiSnapshotWithOptions } from '@storybook/addon-storyshots'
// import TestRenderer from 'react-test-renderer'
// import 'jest-styled-components'
// import { addSerializer } from 'jest-specific-snapshot'
// import styleSheetSerializer from 'jest-styled-components/src/styleSheetSerializer'

// addSerializer(styleSheetSerializer)

initStoryshots({
  framework: 'react',
  /* test: multiSnapshotWithOptions({
    renderer: TestRenderer.create
  }) */
})
