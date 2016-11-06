import React from 'react';
import cssModules from 'react-css-modules';
import HomeSubjects from './HomeSubjects';
import LastStatements from 'components/LastStatements';
import bgSrc from './images/intro-bg.jpg';
import styles from './Home.css';

const Home = () => (
  <div className="container-fluid" styleName="container">
    <div className="row" styleName="row" style={{ backgroundImage: `url(${bgSrc})` }}>
      <div style={{
        fontColor: 'white !important',
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
      >
        <br /><br /><br /><br /><br /><br />
        <h5>Bienvenue sur Débats.co</h5><br />
        <div styleName="introduction">
                        Débats est un projet francophone et participatif, ayant pour objectif <br />
                        d’offrir une synthèse ouverte, impartiale et vérifiable, des sujets clivants de notre société.
                    </div>
        <br /><br /><br /><br /><br /><br />
      </div>
    </div>
    <div className="col-md-1" />
    <div className="subjects-index col-md-7 subjects-home">
      <h1>Sujets d'actualité</h1>
      <table className="table">
        <tbody>
          <ul id="subject">
            <HomeSubjects />
          </ul>
        </tbody>
      </table>
    </div>
    <div className="col-md-3 col-centered" style={{ textAlign: 'right' }} >
      <LastStatements />
    </div>
    <div className="col-md-1" />
  </div>
);

export default cssModules(Home, styles);
