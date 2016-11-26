import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well, HelpBlock } from 'react-bootstrap';
// import DatePicker from '../../../../../../react-bootstrap-moment-date-picker/src/index';

const SummaryStep = ({}) => (
    <Well>
        <h4>Pour résumer, vous dites que : </h4>
        <blockquote>
            Le <a>12 mai 2014</a>,&nbsp;
            sur <a>France Inter</a> (<a>lien</a>, &nbsp;
            <a>François Hollande</a> a déclaré&nbsp;
            <a>'La thématique il n'y a que ça de vrai'</a>,&nbsp;
            prenant ainsi position en faveur de <a>Ordre thématique</a>&nbsp;
            concernant <a>L'enseignement de l'histoire de France</a>.
        </blockquote>
        C'est tout bon ?
    </Well>
);

export default SummaryStep;
