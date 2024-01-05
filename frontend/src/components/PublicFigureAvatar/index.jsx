import React, { PropTypes } from 'react';
import cssModules from 'react-css-modules';
import styles from './PublicFigureAvatar.css';

const PublicFigureAvatar = ({ publicFigure }) => (
  <div
    styleName="wrapper"
    style={{
      backgroundImage: publicFigure.picture
                ? `url(${publicFigure.picture.url})`
                : undefined,
    }}
  />
);
PublicFigureAvatar.propTypes = {
  publicFigure: PropTypes.object.isRequired,
};

export default cssModules(PublicFigureAvatar, styles);
