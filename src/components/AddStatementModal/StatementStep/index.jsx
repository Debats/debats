import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well, HelpBlock } from 'react-bootstrap';
import DatePicker from '../../../../../../react-bootstrap-moment-date-picker/src/index';
import { isValidEvidenceUrl } from 'validations/statements';

const FieldGroup = ({ id, label, help, validationState, ...props }) => (
    <FormGroup controlId={id} validationState={validationState}>
        <ControlLabel>{label}</ControlLabel>
        <FormControl {...props} />
        {help && <HelpBlock>{help}</HelpBlock>}
    </FormGroup>
);

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
            validationState={isValidEvidenceUrl(evidenceUrl)
                ? 'success'
                : (!!evidenceUrl && !!evidenceUrl.length ? 'error' : undefined)}
            onChange={event => onUpdateEvidenceUrl(event.target.value)}
        />

        <FieldGroup id="evidenceFile" label="... ou pièce jointe" type="file" help="Un PDF, une image, ..." />
        <FieldGroup id="evidenteName" label="Nom de la source" type="text" help="20h de TF1" />
        <FieldGroup id="quote" label="Citation exacte" type="text" help="'Je souhaite défendre un truc'" />
        <FormGroup controlId="statementDate">
            <ControlLabel>Date des faits</ControlLabel>
            <DatePicker placeholder="jj/mm/aaaa" />
            <HelpBlock>Explication</HelpBlock>
        </FormGroup>
    </Well>
);

export default StatementStep;
