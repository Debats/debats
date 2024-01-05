import React from 'react';
import cssModules from 'react-css-modules';
import LastStatements from 'components/LastStatements';
import HomeSubjects from './HomeSubjects';
import bgSrc from './images/intro-bg.jpg';
import styles from './Home.css';
import AddStatementButton from 'components/AddStatementButton';

const Home = () => (
  <div className="container-fluid" styleName="container">
    <AddStatementButton />
    <div className="row" styleName="background-title" style={{ backgroundImage: `url(${bgSrc})` }}>
      <div styleName="title-mask">
        <h5 >Bienvenue sur Débats.co</h5>
        <div styleName="introduction">
          <span>Débats est un projet francophone et participatif, ayant pour objectif </span>
          <span>d’offrir une synthèse ouverte, impartiale et vérifiable, des sujets clivants de notre société.</span>
        </div>
      </div>
    </div>
    <div className="col-md-1"></div>
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
    <div className="col-md-1" />
    <div className="col-md-3 col-centered" style={{ textAlign: 'right' }}>
      <LastStatements />
    </div>
    <div className="col-md-1" />
  </div>
);

export default cssModules(Home, styles);
