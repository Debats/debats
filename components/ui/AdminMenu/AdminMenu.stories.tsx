import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import AdminMenu from './index'

const meta = {
  title: 'UI/AdminMenu',
  component: AdminMenu,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 200 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    actions: [
      { label: 'Modifier', icon: '✏️', href: '/admin/edit' },
      { label: 'Fusionner', icon: '🔀', onClick: fn() },
      { label: 'Supprimer', icon: '🗑️', onClick: fn(), variant: 'danger' },
    ],
  },
}

export const SingleAction: Story = {
  args: {
    actions: [{ label: 'Modifier', icon: '✏️', href: '/admin/edit' }],
  },
}
