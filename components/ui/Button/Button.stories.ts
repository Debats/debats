import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Button from './index'

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'small'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Contribuer',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Annuler',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: 'Supprimer',
    variant: 'danger',
  },
}

export const Link: Story = {
  args: {
    children: 'En savoir plus',
    variant: 'link',
  },
}

export const Small: Story = {
  args: {
    children: 'Modifier',
    variant: 'primary',
    size: 'small',
  },
}

export const AsLink: Story = {
  args: {
    children: 'Voir le sujet',
    variant: 'primary',
    href: '/s/example',
  },
}
