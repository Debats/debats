// import React, { PropTypes } from 'react';
import React, { PropTypes, Component } from 'react';
import PublicFigure from './PublicFigure';

class PublicFigures extends Component {

    static propTypes = {
        PublicFigures: PropTypes.arrayOf(PropTypes.object).isRequired,
    }


    render() {
        if (!this.props.PublicFigures) return <span>loading public figures ...</span>;

        const renderChilds = () => this.props.PublicFigures.map(
            pf => <PublicFigure publicFigure={pf} />
        );

        return (
            <div>{renderChilds()}</div>
        );
    }
}

export default PublicFigures;
