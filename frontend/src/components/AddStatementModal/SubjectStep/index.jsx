import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, Well } from 'react-bootstrap';
import SubjectAutocompleteInput from 'components/SubjectAutocompleteInput';
import AddSubjectFrom from './AddSubjectForm';

const SubjectStep = ({ selected, onSelection }) => (
  <Well>
    <FormGroup controlId="subjectSelect" validationState={selected && !selected.customOption ? 'success' : undefined}>
      <ControlLabel>Quel est le sujet qui fait débat ?</ControlLabel>
      {(!selected || !selected.customOption) &&
        <SubjectAutocompleteInput selected={selected} onSelection={onSelection }/>
      }
      {selected && selected.customOption &&
      <AddSubjectFrom
        subject={selected}
        onChange={onSelection}
        onCancel={() => onSelection(null)}
      />}
    </FormGroup>
  </Well>
);
SubjectStep.propTypes = {
  selected: PropTypes.shape({ customOption: PropTypes.bool }), // subject entity
  onSelection: PropTypes.func.isRequired,
};

export default SubjectStep;
