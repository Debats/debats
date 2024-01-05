import React, { PropTypes } from 'react';
import { cond, always, T, compose, assoc, curry, pipe, allPass, prop, test } from 'ramda';
import { Well, Button } from 'react-bootstrap';
import FieldGroup from 'components/FieldGroup';
import { isNotEmpty } from 'helpers/ramda-ext';

const isValidTitle = test(/[\w ]{5,}/);               // At least 5 letters
const isValidDescription = test(/(\w ?){15,}/);     // At least 15 letters

const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotEmpty, always('error')],
  [T, always(null)],
]);

const injectIsComplete = position => assoc(
  'isComplete',
  allPass(
    [
      compose(isValidTitle, prop('title')),
      compose(isValidDescription(), prop('description')),
    ]
  )(position)
  ,
  position
);

const AddPositionForm = ({ position, onChange, onCancel }) => {
  const onChangeField = curry(
    (field, event) => onChange(
      pipe(
        assoc(field, event.target.value),
        injectIsComplete,
      )(position)
    )
  );

  return (
    <Well>
      <h5>Nouvelle position</h5>

      <FieldGroup
        id="title"
        label="Titre"
        type="text"
        help="Titre de la position"
        value={position.title || ''}
        validationState={getFieldValidationState(isValidTitle)(position.title)}
        onChange={onChangeField('title')}
      />

      <FieldGroup
        id="description"
        label="Description"
        type="textarea"
        help="Description du sujet"
        value={position.description || ''}
        validationState={getFieldValidationState(isValidDescription)(position.description)}
        onChange={onChangeField('description')}
      />

      <Button onClick={onCancel} bsStyle="danger" label="Annuler">Annuler</Button>

    </Well>
  );
};
AddPositionForm.propTypes = {
  position: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AddPositionForm;
