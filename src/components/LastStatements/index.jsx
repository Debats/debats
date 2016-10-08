import React, { PropTypes, Component } from 'react';
import CSSModules from 'react-css-modules';
import Statement from './Statement';
import LastStatementsStyle from './LastStatements.css';
import connect from './connector';

class LastStatements extends Component {
    static propTypes = {
        statements: PropTypes.arrayOf(PropTypes.object),
        onAccess: PropTypes.func.isRequired,
    };

    componentWillMount() {
        this.props.onAccess();
    }

    renderStatements = () => this.props.statements.map(
        s => <Statement statement={s} />
    );

    render() {
        if (!this.props.statements) return <span>loading last statements ...</span>;

        return (
            <div styleName="wrapper">
                <h2 styleName="title">Les dernières prises de positions</h2>
                <ul styleName="wrapper">
                    { this.renderStatements() };
                </ul>
            </div>
        );
    }
}

export default connect(CSSModules(LastStatements, LastStatementsStyle));
