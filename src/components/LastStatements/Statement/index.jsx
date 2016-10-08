import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import paths from 'constants/paths';
import PublicFigureAvatar from 'components/PublicFigureAvatar';
import cssModules from 'react-css-modules';
import style from './Statement.css';

const Statement = ({ statement }) => (
    <li id={`statement-${statement.id}`} styleName="wrapper" >
        <PublicFigureAvatar publicFigure={statement.publicFigure} />
        <div styleName="public-figure-text">
            <strong>
                <Link to={paths.getFor.publicFigure(statement.publicFigure)}>
                    {statement.publicFigure.name}
                </Link>
            </strong>
            &nbsp; s'est déclaré pour
            "<strong>{statement.position.title}</strong>"
            dans le débat sur
            <strong><Link to={paths.getFor.subject(statement.subject)}>
                {statement.subject.title}
            </Link></strong>
        </div>
    </li>
);
Statement.propTypes = {
    statement: PropTypes.shape({
        publicFigure: PropTypes.object,
        position: PropTypes.object,
    }).isRequired,
};

export default cssModules(Statement, style);
