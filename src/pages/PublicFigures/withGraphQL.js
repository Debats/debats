import gql from 'graphql-tag'
import { graphql } from 'react-apollo'

const query = gql`
  query {
      publicFigures (last: 20) {
          id
          name
          slug
      }
  }
`

const options = {
  props: ({ data }) => ({ publicFigures: data.publicFigures })
}

export default graphql(query, options)
