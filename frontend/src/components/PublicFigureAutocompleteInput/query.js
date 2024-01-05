import gql from 'graphql-tag'

export default gql`
    query($typed: String!) {
        suggestions: publicFigures (filter: $typed) {
            id
            name
            slug
            presentation
        }
    }
`
