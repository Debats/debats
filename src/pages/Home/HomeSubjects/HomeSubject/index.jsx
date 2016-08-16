import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import { translate } from 'react-polyglot';
import { map, compose, take, prop } from 'ramda';
import paths from 'constants/paths';
import PublicFigureAvatar from 'components/PublicFigureAvatar';

const PublicFigureAvatarMapper = pf => <PublicFigureAvatar publicFigure={pf} />;
const renderAssociatedPublicFigures = compose(
    map(PublicFigureAvatarMapper),
    take(5),
    prop('associatedPublicFigures'),
);

const HomeSubject = ({ subject, t }) => (
    <li>
        <tr>
            <td style="width:50%; border: none; text-transform:uppercase;">
                <h2 className="subjects-title">
                    <Link to={paths.getFor.subject(subject)}>
                        {subject.title}
                    </Link>
                </h2>
                <h6 className="count">
                    {t('public_figure', subject.associatedPublicFigures.length)}
                </h6>
            </td>
            <td style="width:50%; text-align:center;vertical-align:middle;">
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
        associatedPublicFigures: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    t: PropTypes.func.isRequired,
};

export default translate()(HomeSubject);
