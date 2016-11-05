import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well } from 'react-bootstrap';
import PublicFigureAutocompleteInput from 'components/PublicFigureAutocompleteInput';

const PublicFigureStep = ({ selected, onSelection }) => (
    <Well>
        <FormGroup controlId="publicFigureSelect" validationState={!!selected ? 'success' : undefined} >
            <ControlLabel>De qui parlons-nous ?</ControlLabel>
            <PublicFigureAutocompleteInput selected={selected} onSelection={onSelection} />
            <FormControl.Feedback />
        </FormGroup>
    </Well>
);
PublicFigureStep.propTypes = {
    selected: PropTypes.object, // public figure entity
    onSelection: PropTypes.func.isRequired,
};

export default PublicFigureStep;
