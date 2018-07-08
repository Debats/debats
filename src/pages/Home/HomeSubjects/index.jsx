import React, { PropTypes, Component } from 'react'
import HomeSubject from './HomeSubject'
import withGraphQL from './withGraphQL'

class HomeSubjects extends Component {
  static propTypes = {
    lastSubjects: PropTypes.arrayOf(PropTypes.object).isRequired
  }

  render () {
    console.log('props', this.props)
    if (!this.props.lastSubjects) return <span>loading subjects ...</span>

    return (
      <div> {/* TODO Bootstrap */}
        {this.props.lastSubjects.map(
          s => <HomeSubject key={s.id} subject={s} />
        )}
      </div>
    )
  }
}

export default withGraphQL(HomeSubjects)
