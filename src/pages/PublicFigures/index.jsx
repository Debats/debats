import React, { PropTypes, Component } from 'react';
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
            pf => <PublicFigureInList publicFigure={pf} />
        );

        return (
            <div>{renderChilds()}</div>
        );
    }
}

export default connect(PublicFigures);
