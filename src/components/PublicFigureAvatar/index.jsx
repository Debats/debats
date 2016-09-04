import React, { PropTypes } from 'react';
import styles from './PublicFigureAvatar.css';
import cssModules from 'react-css-modules';

const PublicFigureAvatar = ({ publicFigure }) => {
    if (!publicFigure.picture) return null;

    return <div styleName="wrapper" style={{ backgroundUrl: publicFigure.picture.url }}></div>;
};
PublicFigureAvatar.propTypes = {
    publicFigure: PropTypes.object.isRequired,
};

export default cssModules(PublicFigureAvatar, styles);

