'use client'

import { Tabs } from 'radix-ui'
import EditSubjectForm from '../../../../../components/subjects/EditSubjectForm'
import { SubjectFormValues } from '../../../../../components/subjects/SubjectForm'
import { ThemeOption } from '../../../../../components/ui/ThemeSelector'
import SubjectThemes from '../../SubjectThemes'
import RelatedSubjects from '../../RelatedSubjects'
import { RelatedSubjectData } from '../../RelatedSubjects/types'
import styles from './EditSubjectTabs.module.css'

interface EditSubjectTabsProps {
  subjectId: string
  subjectSlug: string
  subject: SubjectFormValues
  availableThemes: ThemeOption[]
  selectedThemeIds: string[]
  relatedSubjects: RelatedSubjectData[]
}

export default function EditSubjectTabs({
  subjectId,
  subjectSlug,
  subject,
  availableThemes,
  selectedThemeIds,
  relatedSubjects,
}: EditSubjectTabsProps) {
  return (
    <Tabs.Root defaultValue="content">
      <Tabs.List className={styles.tabList} aria-label="Sections du sujet">
        <Tabs.Trigger value="content" className={styles.tabTrigger}>
          Contenu
        </Tabs.Trigger>
        <Tabs.Trigger value="classification" className={styles.tabTrigger}>
          Classification
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="content" className={styles.tabContent}>
        <EditSubjectForm subjectId={subjectId} subjectSlug={subjectSlug} subject={subject} />
      </Tabs.Content>

      <Tabs.Content value="classification" className={styles.tabContent}>
        <div className={styles.classificationPanel}>
          {availableThemes.length > 0 && (
            <SubjectThemes
              subjectId={subjectId}
              availableThemes={availableThemes}
              selectedThemeIds={selectedThemeIds}
            />
          )}

          <RelatedSubjects subjectId={subjectId} related={relatedSubjects} canManage={true} />
        </div>
      </Tabs.Content>
    </Tabs.Root>
  )
}
