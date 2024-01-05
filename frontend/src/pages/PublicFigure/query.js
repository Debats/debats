import gql from 'graphql-tag'

export default gql`
  query($slug: String!) {
      publicFigure (slug: $slug) {
          id
          name
          slug
          presentation
      }
  }
`
