import React, { PropTypes } from 'react';
import { cond, always, not, isNil, T, compose } from 'ramda';
import { FormGroup, ControlLabel, FormControl, Well, HelpBlock } from 'react-bootstrap';
import DatePicker from '../../../../../../react-bootstrap-moment-date-picker/src/index'; // not working properly yet
import { isValidEvidenceUrl } from 'validations/statements';

const FieldGroup = ({ id, label, help, validationState, ...props }) => (
    <FormGroup controlId={id} validationState={validationState}>
        <ControlLabel>{label}</ControlLabel>
        <FormControl {...props} />
        {help && <HelpBlock>{help}</HelpBlock>}
    </FormGroup>
);

const isNotNil = compose(not, isNil);

const getEvidenceUrlValidationState = cond([
    [isValidEvidenceUrl, always('success')],
    [isNotNil, always('error')],
    [T, always(undefined)],
])

const StatementStep = ({
    evidenceUrl, onUpdateEvidenceUrl,
    evidenceFile, onUpdateEvidenceFile,
}) => (
    <Well>
        <h4>Donnez-nous quelques détails : </h4>

        <FieldGroup
            id="evidenceUrl"
            label="Lien internet ..."
            type="text"
            placeholder="http://"
            help="Un article en ligne, une vidéo, ..."
            value={evidenceUrl}
            validationState={getEvidenceUrlValidationState(evidenceUrl)}
            onChange={event => onUpdateEvidenceUrl(event.target.value)}
        />

        <FieldGroup id="evidenceFile" label="... ou pièce jointe" type="file" help="Un PDF, une image, ..." />
        <FieldGroup id="evidenteName" label="Nom de la source" type="text" help="20h de TF1" />
        <FieldGroup id="quote" label="Citation exacte" type="text" help="'Je souhaite défendre un truc'" />
        <FormGroup controlId="statementDate">
            <ControlLabel>Date des faits</ControlLabel>
            { /* Not working properly yet <DatePicker placeholder="jj/mm/aaaa" /> */}
            <FormControl type="text" placeholder="jj/mm/aaaa" />
            <HelpBlock>Explication</HelpBlock>
        </FormGroup>
    </Well>
);

export default StatementStep;
