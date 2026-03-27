'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSubjectAction } from '../../../actions/delete-subject'
import AdminMenu from '../../../../components/ui/AdminMenu'
import ConfirmAction from '../../../../components/ui/ConfirmAction'

interface SubjectAdminMenuProps {
  subjectId: string
  subjectSlug: string
  canEdit: boolean
  canDelete: boolean
}

export default function SubjectAdminMenu({
  subjectId,
  subjectSlug,
  canEdit,
  canDelete,
}: SubjectAdminMenuProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = useCallback(async () => {
    const result = await deleteSubjectAction(subjectId)
    if (!result.success) {
      throw new Error(result.error)
    }
    router.push('/s')
  }, [subjectId, router])

  return (
    <AdminMenu
      actions={[
        ...(canEdit ? [{ label: 'Modifier', icon: '✎', href: `/s/${subjectSlug}/modifier` }] : []),
        ...(canDelete
          ? [
              {
                label: 'Supprimer',
                icon: '🗑',
                variant: 'danger' as const,
                keepOpen: true,
                onClick: () => setShowDeleteConfirm(true),
              },
            ]
          : []),
      ]}
    >
      {showDeleteConfirm && (
        <ConfirmAction
          open
          warning="Le sujet et toutes ses prises de position seront supprimés."
          confirmLabel="Supprimer"
          pendingLabel="Suppression…"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </AdminMenu>
  )
}
