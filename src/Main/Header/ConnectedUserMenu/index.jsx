import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import paths from 'constants/paths';

const ConnectedUserMenu = ({ user, onLogOut }) => (
    <li className="dropdown">
        <a href="#" className="dropdown-toggle" data-toggle="dropdown">
            {user.name}
            <b className="caret"></b>
        </a>
        <ul className="dropdown-menu">
            <li><Link to={paths.getFor.user(user)}>Profil</Link></li>
            <li className="divider"></li>
            <li><a onClick={onLogOut}>Déconnexion</a></li>
        </ul>
    </li>
);
ConnectedUserMenu.propTypes = {
    user: PropTypes.object.isRequired,
    onLogOut: PropTypes.func.isRequired,
};

export default ConnectedUserMenu;
