import React from 'react';
import HomeSubjects from './HomeSubjects';
import LastStatements from 'components/LastStatements';
import bgSrc from './images/intro-bg.jpg';

const Home = () => (
    <div
        className="container-fluid"
        style="width:100vw; position:relative; margin-left:-50vw;left:50%;"
    >
        <div
            className="row"
            style={`background:url('${bgSrc}') %>');background-size:cover;background-position: center center;`}
        >
            <div style="font-color:white !important;text-align: center;vertical-align: middle;">
                <br /><br /><br /><br /><br /><br />
                    <h5>Bienvenue sur Débats.co</h5><br />
                    <div id="white">
                        Débats est un projet francophone et participatif, ayant pour objectif <br />
                        d’offrir une synthèse ouverte, impartiale et vérifiable, des sujets clivants de notre société.
                    </div>
                    <br /><br /><br /><br /><br /><br />
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
        <div className="col-md-3 col-centered" style="text-align:right;">
            <LastStatements />
        </div>
        <div className="col-md-1"></div>
    </div>
);

export default Home;
