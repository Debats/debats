import React from 'react';
import cssModules from 'react-css-modules';
import styles from './Contact.css';

const Contact = () => (
  <div>
    <h1>Contact</h1>
    <p>
      <p>
        Nous sommes disponibles par email ou sur les réseaux sociaux.
      </p>

      <ul className="list-inline banner-social-buttons">
        <li>
          <a href="mailto:contact@debats.co" className="btn btn-default btn-lg">
            <i className="fa fa-envelope-o fa-fw" /><span className="network-name">&nbsp;Courriel</span>
          </a>
        </li>
        <li>
          <a href="https://twitter.com/debatsco" className="btn btn-default btn-lg">
            <i className="fa fa-twitter fa-fw" /> <span className="network-name">Twitter</span>
          </a>
        </li>
      </ul>
    </p>
  </div>
);

export default cssModules(Contact, styles);
