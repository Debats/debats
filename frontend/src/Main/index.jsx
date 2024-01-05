import React, { PropTypes } from 'react';
import Header from './Header';
import FlashMessages from './FlashMessages';
import Footer from './Footer';
import GoogleAnalytics from './GoogleAnalytics';

const Main = ({ children }) => (
  <div className="container-fluid">
    <Header />
    <FlashMessages />
    <div className="main-content">
      {children}
    </div>
    <Footer />
    <GoogleAnalytics />
  </div>
);
Main.propTypes = {
  children: PropTypes.node,
};

export default Main;
