import React, { PropTypes } from 'react';
import styles from './PublicFigureAvatar.css';
import cssModules from 'react-css-modules';

const PublicFigureAvatar = ({ publicFigure }) => (
    <div
        styleName="wrapper"
        style={{ backgroundUrl: !!publicFigure.picture ? publicFigure.picture.url : undefined }}
    ></div>
);
PublicFigureAvatar.propTypes = {
    publicFigure: PropTypes.object.isRequired,
};

export default cssModules(PublicFigureAvatar, styles);
