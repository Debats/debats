'use client'

import { useState } from 'react'
import AdminMenu from '../../../../components/ui/AdminMenu'
import { ReviewDetail } from '../../../../domain/read-models/review'
import MergeForm from './MergeForm'
import RenameForm from './RenameForm'

interface ArgumentAdminMenuProps {
  argument: { id: string; title: string; description: string }
  /** The revision of the argument's stream the page shows: a rename made meanwhile is not overwritten */
  revision: number
  /** What readers said of the argument, for the rename form to ask what the rename makes of it */
  review: ReviewDetail | null
  canRename: boolean
  canMerge: boolean
}

type Panel = 'rename' | 'merge'

/** Le menu « Gérer » d'un argument : le renommer ou le fusionner dans un autre. */
export default function ArgumentAdminMenu({
  argument,
  revision,
  review,
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
        <RenameForm
          argument={argument}
          revision={revision}
          review={review}
          onCancel={() => setPanel(undefined)}
        />
      )}
      {panel === 'merge' && <MergeForm argument={argument} onCancel={() => setPanel(undefined)} />}
    </AdminMenu>
  )
}
