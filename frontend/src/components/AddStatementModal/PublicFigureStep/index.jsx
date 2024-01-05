import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well } from 'react-bootstrap';
import PublicFigureAutocompleteInput from 'components/PublicFigureAutocompleteInput';
import AddPublicFigureForm from './AddPublicFigureForm';

const PublicFigureStep = ({ selected, onSelection }) => (
    <Well>
      <FormGroup controlId="publicFigureSelect" validationState={selected && !selected.customOption ? 'success' : undefined}>
        <ControlLabel>De qui parlons-nous ?</ControlLabel>
        {(!selected || !selected.customOption) &&
          <PublicFigureAutocompleteInput
            selected={selected}
            onSelection={onSelection}
          />}
        {selected && selected.customOption &&
          <AddPublicFigureForm
            publicFigure={selected}
            onChange={onSelection}
            onCancel={() => onSelection(null)}
          />}
        <FormControl.Feedback />
      </FormGroup>
    </Well>
  );
PublicFigureStep.propTypes = {
  selected: PropTypes.object, // public figure entity
  onSelection: PropTypes.func.isRequired,
};

export default PublicFigureStep;
