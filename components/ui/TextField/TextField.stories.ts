import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TextField from './index'

const meta = {
  title: 'UI/TextField',
  component: TextField,
  tags: ['autodocs'],
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Nom',
    id: 'name',
    placeholder: 'Jean Dupont',
  },
}

export const Required: Story = {
  args: {
    label: 'Adresse e-mail',
    id: 'email',
    type: 'email',
    required: true,
    placeholder: 'jean@example.com',
  },
}

export const WithError: Story = {
  args: {
    label: 'Mot de passe',
    id: 'password',
    type: 'password',
    required: true,
    error: 'Le mot de passe doit contenir au moins 8 caractères',
  },
}

export const WithValue: Story = {
  args: {
    label: 'URL Wikipedia',
    id: 'wikipedia',
    defaultValue: 'https://fr.wikipedia.org/wiki/Example',
  },
}
