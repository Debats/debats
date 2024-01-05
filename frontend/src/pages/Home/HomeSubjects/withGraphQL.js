import gql from 'graphql-tag'
import { graphql } from 'react-apollo'

const query = gql`
  query {
      subjects (last: 20) {
          id
          title
          slug
          publicFigures {
              id
              name,
              slug
          }
      }
  }
`

const options = {
  props: ({ data }) => ({ lastSubjects: data.subjects })
}

export default graphql(query, options)
