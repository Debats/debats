import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well, Button } from 'react-bootstrap';
import AddPositionForm from './AddPositionForm';

const PositionStep = ({ subject, selected, onSelection }) => {
  const renderButtons = () => (
    subject.positions.map(position => (
      <Button
        block
        active={selected && position.id === selected.id}
        key={position.id}
        onClick={() => onSelection(position)}
      >
        {position.title}
      </Button>
    ))
  );

  const emptyNewPosition = { customOption: true };

  return (
    <Well>
      <FormGroup controlId="positionSelect" validationState={!!selected ? 'success' : undefined}>
        <ControlLabel>Quelle position a été prise ?</ControlLabel>
        {!!subject.positions && (!selected || !selected.customOption) &&
          renderButtons(subject.positions)
        }
        <hr/>
        {!!subject.positions && (!selected || !selected.customOption) &&
          <Button block key="new" onClick={() => onSelection(emptyNewPosition)}>
            Nouvelle position
          </Button>
        }
        {(!subject.positions || (selected && selected.customOption)) &&
          <AddPositionForm
            position={selected || emptyNewPosition}
            onChange={onSelection}
            onCancel={() => onSelection(null)}
          />
        }
      </FormGroup>
    </Well>
  );
};
PositionStep.propTypes = {
    subject: PropTypes.shape({
        positions: PropTypes.arrayOf(PropTypes.object),
    }).isRequired,
    selected: PropTypes.shape({
      customOption: PropTypes.bool,
    }),
    onSelection: PropTypes.func.isRequired,
};

export default PositionStep;
