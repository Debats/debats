import type { Preview } from '@storybook/nextjs-vite'

import '../styles/tokens.css'
import '../styles/base.css'
import { fontVariables } from '../app/fonts'

const preview: Preview = {
  // Les stories héritent de la typographie du site, posée sur <html> par le layout
  decorators: [
    (Story) => (
      <div className={fontVariables}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
