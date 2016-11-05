import React, { PropTypes } from 'react';

// Identity Component Wrapper
// like a identity function but for react components

const Identity = ({ children }) => <div>{children}</div>;
Identity.propTypes = {
    children: PropTypes.node,
};

export default Identity;
