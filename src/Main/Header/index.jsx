import React from 'react';
import { Link } from 'react-router';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import cssModules from 'react-css-modules';
import paths from 'constants/paths';
import logoImg from './images/logo_header.png';
import styles from './Header.css';
import ConnectedUserMenu from './';

const renderUserMenu = (isConnected) => (
    isConnected
    ? <ConnectedUserMenu />
    : [
        <li><Link to="#">Connexion</Link></li>,  /* modal ! */
        <li><Link to="#">Inscription</Link></li>, /* modal ! */
    ]
);

const Header = () => (
    <Navbar bsStyle="custom" fixedTop collapseOnSelect>
        <Navbar.Header>
            <Navbar.Brand>
                <Link to={paths.root} styleName="logo">
                    <img src={logoImg} />
                </Link>
            </Navbar.Brand>
            <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
            <Nav pullRight>
                <NavItem href={paths.subjects}>Sujets</NavItem>
                <NavItem href={paths.publicFigures}>Personnalités</NavItem>
                <NavItem href={paths.manual}>Mode d'emploi</NavItem>
                {renderUserMenu()}
            </Nav>
        </Navbar.Collapse>
    </Navbar>
);

export default cssModules(Header, styles);
