'use client'

import { useState } from 'react'
import AdminMenu from '../../../../components/ui/AdminMenu'
import MergeForm from './MergeForm'
import RenameForm from './RenameForm'

interface ArgumentAdminMenuProps {
  argument: { id: string; title: string; description: string }
  /** The revision of the argument's stream the page shows: a rename made meanwhile is not overwritten */
  revision: number
  canRename: boolean
  canMerge: boolean
}

type Panel = 'rename' | 'merge'

/** Le menu « Gérer » d'un argument : le renommer ou le fusionner dans un autre. */
export default function ArgumentAdminMenu({
  argument,
  revision,
  canRename,
  canMerge,
}: ArgumentAdminMenuProps) {
  const [panel, setPanel] = useState<Panel>()

  return (
    <AdminMenu
      actions={[
        ...(canRename
          ? [{ label: 'Renommer', icon: '✎', keepOpen: true, onClick: () => setPanel('rename') }]
          : []),
        ...(canMerge
          ? [
              {
                label: 'Fusionner dans…',
                icon: '⇄',
                keepOpen: true,
                onClick: () => setPanel('merge'),
              },
            ]
          : []),
      ]}
    >
      {panel === 'rename' && (
        <RenameForm argument={argument} revision={revision} onCancel={() => setPanel(undefined)} />
      )}
      {panel === 'merge' && <MergeForm argument={argument} onCancel={() => setPanel(undefined)} />}
    </AdminMenu>
  )
}
