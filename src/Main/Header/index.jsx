import React from 'react';
import cssModules from 'react-css-modules';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer, IndexLinkContainer } from 'react-router-bootstrap';

import ConnectedUserMenu from './';

import paths from 'constants/paths';
import logoImg from './images/logo_header.png';
import styles from './Header.css';

const renderUserMenu = (isConnected) => (
  isConnected
  ? <ConnectedUserMenu />
  : [
      <li><a>Connexion</a></li>,  /* modal ! */
      <li><a>Inscription</a></li>, /* modal ! */
  ]
);

const Header = () => (
  <Navbar bsStyle="custom" fixedTop collapseOnSelect>
    <Navbar.Header>
      <Navbar.Brand>
        <IndexLinkContainer to="/" styleName="logo">
          <NavItem>
            <img src={logoImg} />
          </NavItem>
        </IndexLinkContainer>
      </Navbar.Brand>
      <Navbar.Toggle />
    </Navbar.Header>
    <Navbar.Collapse>
      <Nav pullRight>
        <LinkContainer to={{ pathname: paths.subjects, query: {} }}>
          <NavItem>Sujets</NavItem>
        </LinkContainer>
        <LinkContainer to={{ pathname: paths.publicFigures, query: {} }}>
          <NavItem>Personnalités</NavItem>
        </LinkContainer>
        <LinkContainer to={{ pathname: paths.manual, query: {} }}>
          <NavItem>Mode d'emploi</NavItem>
        </LinkContainer>
        {renderUserMenu()}
      </Nav>
    </Navbar.Collapse>
  </Navbar>
);

export default cssModules(Header, styles);
