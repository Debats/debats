import React from 'react';
import paths from 'constants/paths';
import { Link } from 'react-router';

const Footer = () => (
    <footer className="footer">
        <div className="col-md-1"></div>
        <div className="col-md-3">
            <small>
                <a href="#">Crédits</a>
                |
                <a href="#">Mentions Légales</a>
            </small></div>
        <div className="col-md-7">
            <nav>
                <ul>
                    <li><Link to={paths.about}>À propos</Link></li>
                    <li><Link to={paths.contact}>Contact</Link></li>
                    <li><Link to={paths.external.twitter} target="_blank">Twitter</Link></li>
                </ul>
            </nav>
        </div>
        <div className="col-md-1"></div>
    </footer>
);

export default Footer;
