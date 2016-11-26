import React, { PropTypes } from 'react';
import {cond, always, not, isNil, T, compose} from 'ramda';
import { Well, Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import FieldGroup from 'components/FieldGroup';

const isValidName = name => true;
const isValidPresentation = presentation => true;
const isValidWikipediaUrl = url => true;
const isValidSiteUrl = url => true;

const isNotNil = compose(not, isNil);

const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotNil, always('error')],
  [T, always(undefined)],
]);

const getNameValidationState = getFieldValidationState(isValidName);
const getPresentationValidationState = getFieldValidationState(isValidPresentation);
const getWikipediaUrlValidationState = getFieldValidationState(isValidWikipediaUrl);
const getSiteUrlValidationState = getFieldValidationState(isValidSiteUrl);

const NewPublicFigureForm = ({ name, presentation, wikipediaUrl, siteUrl, pictureFile, onChange, onCancel }) => (
  <Well>
    <h5>Nouvelle personnalité</h5>

    <FieldGroup
      id="name"
      label="Nom"
      type="text"
      help="Nom de la personnalité (doit avoir une page Wikipédia)"
      value={name}
      validationState={getNameValidationState(name)}
      onChange={event => onChange(event.target.value)}
    />

    <FieldGroup
      id="presentation"
      label="Présentation"
      type="textarea"
      help="Présentation de la personnalité"
      validationState={getPresentationValidationState(presentation)}
      onChange={event => onChange(event.target.value)}
    />

    <FieldGroup
      id="wikipedia-url"
      type="text"
      label="Page Wikipédia"
      placeholder="http://"
      help="Adresse de la page Wikipédia"
      validationState={getWikipediaUrlValidationState(wikipediaUrl)}
      onChange={event => onChange(event.target.value)}
    />

    <FieldGroup
      id="site-url"
      type="text"
      label="Site personnel"
      placeholder="http://"
      help="Adresse du site officiel"
      validationState={getSiteUrlValidationState(siteUrl)}
      onChange={event => onChange(event.target.value)}
    />

    <Dropzone
      accept="image/*"
      onDrop={event => onChange(event.target.value)}
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
      {!pictureFile &&
        <span>
            ... Déposez vos fichiers une image de la personnalité !
        </span>
      }
      {!!pictureFile &&
        <img height="64px" src={pictureFile.preview} />
      }
    </Dropzone>

    <Button onClick={onCancel} bsStyle="danger" label="Annuler">Annuler</Button>

  </Well>
);
NewPublicFigureForm.propTypes = {
  name: PropTypes.string.isRequired,
  presentation: PropTypes.string,
  wikipediaUrl: PropTypes.string,
  siteUrl: PropTypes.string,
  pictureFile: PropTypes.shape({ preview: PropTypes.string.isRequired }),
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default NewPublicFigureForm;
