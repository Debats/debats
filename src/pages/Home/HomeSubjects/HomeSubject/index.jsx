import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import { map, compose, take, prop } from 'ramda';
import paths from 'constants/paths';
import PublicFigureAvatar from 'components/PublicFigureAvatar';

const PublicFigureAvatarMapper = pf => <PublicFigureAvatar key={pf.id} publicFigure={pf} />;
const renderAssociatedPublicFigures = compose(
    map(PublicFigureAvatarMapper),
    take(5),
    prop('remarquablePublicFigures'),
);

const HomeSubject = ({ subject }) => (
    <li>
        <tr>
            <td style={{ width:'50%', border: 'none', textTransform: 'uppercase' }}>
                <h2 className="subjects-title">
                    <Link to={paths.getFor.subject(subject)}>
                        {subject.title}
                    </Link>
                </h2>
                <h6 className="count">
                    {`${subject.remarquablePublicFigures.length} personnalité(s)`}
                </h6>
            </td>
            <td style={{ width:'50%', textAlign: 'center', verticalAlign: 'middle' }}>
                {renderAssociatedPublicFigures(subject)}
            </td>
            <td className="seemore">
                <div>
                    <Link to={paths.getFor.subject(subject)}>Voir plus de personnalités</Link>
                </div>
            </td>
        </tr>
    </li>
);
HomeSubject.propTypes = {
    subject: PropTypes.shape({
        title: PropTypes.string.isRequired,
        remarquablePublicFigures: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
};

export default (HomeSubject);
