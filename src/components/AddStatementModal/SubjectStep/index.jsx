import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well } from 'react-bootstrap';
import SubjectAutocompleteInput from 'components/SubjectAutocompleteInput';

const SubjectStep = ({ selected, onSelection }) => (
  <Well>
    <FormGroup controlId="subjectSelect" validationState={!!selected ? 'success' : undefined}>
      <ControlLabel>Quel est le sujet qui fait débat ?</ControlLabel>
      <SubjectAutocompleteInput selected={selected} onSelection={onSelection} />
    </FormGroup>
  </Well>
);

export default SubjectStep;
