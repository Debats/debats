import React from 'react'
import HomeSubject from './HomeSubject'
import withGraphQL from './withGraphQL'

export default withGraphQL(
  ({ lastSubjects }) => <Choose>
    <When condition={lastSubjects}>
      <div>
        <For each='subject' of={lastSubjects}>
          <HomeSubject key={subject.id} subject={subject} />
        </For>
      </div>
    </When>
    <Otherwise>
      <span>loading subjects ...</span>
    </Otherwise>
  </Choose>
)
