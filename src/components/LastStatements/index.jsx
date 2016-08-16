import React, { PropTypes } from 'react';
import { map } from 'ramda';
import Statement from './Statement';

const renderStatements = (statements) => (
    map(s => <Statement statement={s} />, statements)
);

const LastStatements = ({ statements }) => (
    <div id="last-statements">
        <h2>Les dernières prises de positions</h2>
        <ul id="last-statements">
            {renderStatements(statements)};
        </ul>
    </div>
);
LastStatements.propTypes = {
    statements: PropTypes.arrayOf(PropTypes.object),
};

export default LastStatements;
