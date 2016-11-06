import React, { PropTypes, Component } from 'react';
import HomeSubject from './HomeSubject';
import connector from './connectors';

class HomeSubjects extends Component {

  static propTypes = {
    subjects: PropTypes.arrayOf(PropTypes.object).isRequired,
    onAccess: PropTypes.func.isRequired,
  }

  componentWillMount() {
    this.props.onAccess();
  }

  render() {
    if (!this.props.subjects) return <span>loading subjects ...</span>;

    return (
      <div> {/* TODO Bootstrap */}
        {this.props.subjects.map(
                    s => <HomeSubject key={s.id} subject={s} />
                )}
      </div>
    );
  }

}

export default connector(HomeSubjects);
