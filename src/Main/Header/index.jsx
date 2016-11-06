import React from 'react';
import { Link } from 'react-router';
import CSSModules from 'react-css-modules';
import paths from 'constants/paths';
import logoImg from './images/logo_header.png';
import HeaderStyle from './HeaderStyle.css';
import ConnectedUserMenu from './';
import AddStatementButton from 'components/AddStatementButton';

const renderUserMenu = isConnected => (
    isConnected
    ? <ConnectedUserMenu />
    : [
      <li key="login"><Link to="#">Connexion</Link></li>,  /* modal ! */
      <li key="signup"><Link to="#">Inscription</Link></li>, /* modal ! */
    ]
);

const Header = () => (
  <header className="navbar navbar-fixed-top" styleName="navbar">
    <div className="container-fluid">
      <div className="col-md-1" />
      <div className="col-md-2">
        <Link to={paths.root} styleName="logo">
          <img src={logoImg} />
        </Link>
      </div>
      <div className="col-md-8">
        <nav>
          <ul className="nav navbar-nav navbar-right">
            <li><AddStatementButton /></li>
            <li><Link to={paths.subjects}>Sujets</Link></li>
            <li><Link to={paths.publicFigures}>Personnalités</Link></li>
            <li><Link to={paths.manual}>Mode d'emploi</Link></li>
            {renderUserMenu()}
          </ul>
        </nav>
      </div>
      <div className="col-md-1" />
    </div>
  </header>
);

export default CSSModules(Header, HeaderStyle);
