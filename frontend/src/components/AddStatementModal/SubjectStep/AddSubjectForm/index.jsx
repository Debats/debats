import React, { PropTypes } from 'react';
import { cond, always, T, compose, assoc, curry, pipe, allPass, prop, test } from 'ramda';
import { Well, Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import FieldGroup from 'components/FieldGroup';
import { isNotEmpty } from 'helpers/ramda-ext';

const isValidTitle = test(/[\w ]{5,}/);               // At least 5 letters
const isValidPresentation = test(/(\w ?){15,}/);     // At least 15 letters

const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotEmpty, always('error')],
  [T, always(null)],
]);

const injectIsComplete = subject => assoc(
  'isComplete',
  allPass(
    [
      compose(isValidTitle, prop('title')),
      compose(isValidPresentation(), prop('presentation')),
    ]
  )(subject)
  ,
  subject
);

const AddSubjectForm = ({ subject, onChange, onCancel }) => {
  const onChangeField = curry(
    (field, event) => onChange(
      pipe(
        assoc(field, event.target.value),
        injectIsComplete,
      )(subject)
    )
  );
  const onChangePicture = pictureFiles => onChange(assoc('pictureFile', pictureFiles[0], subject));

  return (
    <Well>
      <h5>Nouveau sujet</h5>

      <FieldGroup
        id="subject"
        label="Sujet"
        type="text"
        help="Formulation du sujet"
        value={subject.title}
        validationState={getFieldValidationState(isValidTitle)(subject.title)}
        onChange={onChangeField('title')}
      />

      <FieldGroup
        id="presentation"
        label="Présentation"
        type="textarea"
        help="Présentation du sujet"
        validationState={getFieldValidationState(isValidPresentation)(subject.presentation)}
        onChange={onChangeField('presentation')}
      />

      <Dropzone
        accept="image/*"
        onDrop={onChangePicture}
        multiple={false}
        maxSize={1000000}
        style={{
          /* TODO : Inline style refacto (embedded ? module ? global ?) */
          width: 500,
          height: 70,
          borderWidth: 2,
          borderColor: '#666',
          borderStyle: 'dashed',
          borderRadius: 5,
        }}
        activeStyle={{
          borderStyle: 'solid',
          backgroundColor: '#eee',
        }}
        rejectStyle={{
          borderStyle: 'solid',
          backgroundColor: '#ffdddd',
        }}
      >
        {!subject.pictureFile &&
        <span>
            ... Déposez ici une image illustrant le sujet
        </span>
        }
        {!!subject.pictureFile &&
        <img height="64px" src={subject.pictureFile.preview} />
        }
      </Dropzone>

      <Button onClick={onCancel} bsStyle="danger" label="Annuler">Annuler</Button>

    </Well>
  );
};
AddSubjectForm.propTypes = {
  subject: PropTypes.shape({
    title: PropTypes.string.isRequired,
    presentation: PropTypes.string,
    pictureFile: PropTypes.shape({ preview: PropTypes.string.isRequired }),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AddSubjectForm;
