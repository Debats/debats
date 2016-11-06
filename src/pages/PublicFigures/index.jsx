import React, { PropTypes, Component } from 'react';

import LastStatements from 'components/LastStatements';
import PublicFigureInList from './PublicFigureInList';
import connect from './connector';

class PublicFigures extends Component {

  static propTypes = {
    publicFigures: PropTypes.arrayOf(PropTypes.object).isRequired,
    onAccess: PropTypes.func.isRequired,
  }

  componentWillMount() {
    this.props.onAccess();
  }

  render() {
    if (!this.props.publicFigures) return <span>loading public figures ...</span>;

    const renderChilds = () => this.props.publicFigures.map(
            pf => <PublicFigureInList key={pf.id} publicFigure={pf} />
        );

    return (
      <div>
        <div className="col-md-9">
          {renderChilds()}
        </div>
        <div className="col-md-3">
          <LastStatements />
        </div>
      </div>
    );
  }
}

export default connect(PublicFigures);
