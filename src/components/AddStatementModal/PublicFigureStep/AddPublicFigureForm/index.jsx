import React, { PropTypes } from 'react';
import { cond, always, not, isNil, T, compose, assoc, curry, pipe, allPass, prop, test, either, isEmpty } from 'ramda';
import { Well, Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import FieldGroup from 'components/FieldGroup';
import { urlRegex } from 'validations/generic';

const isValidName = test(/[\w ]{5,}/);               // At least 5 letters
const isValidPresentation = test(/(\w ?){15,}/);     // At least 15 letters
const isValidWikipediaUrl = test(urlRegex);
const isValidSiteUrl = test(urlRegex);

const isNotNil = compose(not, isNil);

const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotNil, always('error')],
  [T, always(null)],
]);

const getNameValidationState = getFieldValidationState(isValidName);
const getPresentationValidationState = getFieldValidationState(isValidPresentation);
const getWikipediaUrlValidationState = getFieldValidationState(isValidWikipediaUrl);
const getSiteUrlValidationState = getFieldValidationState(either(isValidSiteUrl, isEmpty));

const injectIsComplete = publicFigure => assoc(
  'isComplete',
  allPass(
    [
      compose(isValidName, prop('name')),
      compose(isValidPresentation(), prop('presentation')),
      compose(isValidWikipediaUrl(), prop('wikipediaUrl')),
    ]
  )(publicFigure)
  ,
  publicFigure
);

const AddPublicFigureForm = ({ publicFigure, onChange, onCancel }) => {
  const onChangeField = curry(
    (field, event) => onChange(
      pipe(
        assoc(field, event.target.value),
        injectIsComplete,
      )(publicFigure)
    )
  );
  const onChangePicture = pictureFiles => onChange(assoc('pictureFile', pictureFiles[0], publicFigure));

  return (
    <Well>
      <h5>Nouvelle personnalité</h5>

      <FieldGroup
        id="name"
        label="Nom"
        type="text"
        help="Nom de la personnalité (doit avoir une page Wikipédia)"
        value={publicFigure.name}
        validationState={getNameValidationState(publicFigure.name)}
        onChange={onChangeField('name')}
      />

      <FieldGroup
        id="presentation"
        label="Présentation"
        type="textarea"
        help="Présentation de la personnalité"
        validationState={getPresentationValidationState(publicFigure.presentation)}
        onChange={onChangeField('presentation')}
      />

      <FieldGroup
        id="wikipedia-url"
        type="text"
        label="Page Wikipédia"
        placeholder="http://"
        help="Adresse de la page Wikipédia"
        validationState={getWikipediaUrlValidationState(publicFigure.wikipediaUrl)}
        onChange={onChangeField('wikipediaUrl')}
      />

      <FieldGroup
        id="site-url"
        type="text"
        label="Site personnel"
        placeholder="http://"
        help="Adresse du site officiel"
        validationState={getSiteUrlValidationState(publicFigure.siteUrl)}
        onChange={onChangeField('siteUrl')}
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
        {!publicFigure.pictureFile &&
        <span>
            ... Déposez ici une image de la personnalité
        </span>
        }
        {!!publicFigure.pictureFile &&
        <img height="64px" src={publicFigure.pictureFile.preview} />
        }
      </Dropzone>

      <Button onClick={onCancel} bsStyle="danger" label="Annuler">Annuler</Button>

    </Well>
  );
};
AddPublicFigureForm.propTypes = {
  publicFigure: PropTypes.shape({
    name: PropTypes.string.isRequired,
    presentation: PropTypes.string,
    wikipediaUrl: PropTypes.string,
    siteUrl: PropTypes.string,
    pictureFile: PropTypes.shape({ preview: PropTypes.string.isRequired }),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default AddPublicFigureForm;
