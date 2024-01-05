// @flow
import React from 'react'
import Autocomplete from 'react-autocomplete'
import { ApolloConsumer } from 'react-apollo'
import { compose, prop, path } from 'ramda'
import PublicFigureAvatar from 'components/PublicFigureAvatar'
import query from './query'

type PublicFigure = {
  id: string,
  name: string,
  presentation: string,
  slug: string
}

type Props = {|
  +selected: ?PublicFigure,
  +onSelection: PublicFigure => void
|}

type State = {|
  loading: boolean,
  suggestions: [PublicFigure],
  typed: string
|}

class PublicFigureAutocompleteInput extends React.Component<Props, State> {
  state = {
    loading: false,
    typed: this.props.selected ? this.props.selected.name : '',
    suggestions: []
  }

  onTyped = async (typed: string, client) => {
    this.setState({ loading: true, typed })
    const { data: { suggestions } } = await client.query({
      query,
      variables: { typed }
    })
    this.setState({ suggestions, loading: false })
  }

  render () {
    return (
      <ApolloConsumer>
        {client => (
          <Autocomplete
            getItemValue={prop('name')}
            items={this.state.suggestions}
            renderItem={(publicFigure, isHighlighted) =>
              <div style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
                <PublicFigureAvatar publicFigure={publicFigure} />
                <span>{publicFigure.name}</span>
              </div>
            }
            value={this.state.typed}
            onChange={(event, value) => this.onTyped(value, client)}
            onSelect={this.props.onSelection}
          />
        )}
      </ApolloConsumer>
    )
  }
}

export default PublicFigureAutocompleteInput;
