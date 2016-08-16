import React from 'react';
import { Link } from 'react-router';
import paths from 'constants/paths';
import logoImg from './images/logo_header.png';
import ConnectedUserMenu from './';

const renderUserMenu = (isConnected) => (
    isConnected
    ? <ConnectedUserMenu />
    : [
        <li><Link to="#">Connexion></Link></li>,  /* modal ! */
        <li><Link to="#">Inscription</Link></li>, /* modal ! */
    ]
);

const Header = () => (
    <header className="navbar navbar-fixed-top navbar-custom">
        <div className="container-fluid">
            <div className="col-md-1"></div>
            <div className="col-md-2">
                <Link to={paths.root} id="logo">
                    <img src={logoImg} />
                </Link>
            </div>
            <div className="col-md-8">
                <nav>
                    <ul className="nav navbar-nav navbar-right">
                        <li><Link to={paths.subjects}>Sujets</Link></li>
                        <li><Link to={paths.publicFigures}>Personnalités</Link></li>
                        <li><Link to={paths.manual}>Mode d'emploi</Link></li>
                        {renderUserMenu()}
                    </ul>
                </nav>
            </div>
            <div className="col-md-1"></div>
        </div>
    </header>
);

export default Header;
