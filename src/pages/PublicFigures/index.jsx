import React from 'react'
import LastStatements from 'components/LastStatements'
import PublicFigureInList from './PublicFigureInList'
import withGraphQL from './withGraphQL'

export default withGraphQL(
  ({ publicFigures }) => <div>
    <div className="col-md-9">
      <Choose>
        <When condition={publicFigures}>
          <For each='publicFigure' of={publicFigures}>
            <PublicFigureInList key={publicFigure.id} publicFigure={publicFigure} />
          </For>
        </When>
        <Otherwise>
          <span>loading public figures ...</span>
        </Otherwise>
      </Choose>
    </div>
    <div className="col-md-3">
      <LastStatements />
    </div>
  </div>
)
