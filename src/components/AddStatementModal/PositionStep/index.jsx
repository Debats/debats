import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel, FormControl, Well, Button } from 'react-bootstrap';

const renderButtons = (allPositions, selectedPosition, onSelection) => (
    allPositions.map(position => (
        <Button
            block
            active={selectedPosition && position.id === selectedPosition.id}
            key={position.id}
            onClick={() => onSelection(position)}
        >
            {position.title}
        </Button>
    ))
);

const PositionStep = ({ subject, selected, onSelection }) => (
    <Well>
        <FormGroup controlId="positionSelect" validationState={!!selected ? 'success' : undefined}>
            <ControlLabel>Quelle position a été prise ?</ControlLabel>
            {renderButtons(subject.positions, selected, (position) => (onSelection(position.id)))}
        </FormGroup>
    </Well>
);
PositionStep.propTypes = {
    subject: PropTypes.shape({
        positions: PropTypes.arrayOf(PropTypes.object)
    }).isRequired,
    selected: PropTypes.object,
    onSelection: PropTypes.func.isRequired,
};

export default PositionStep;
