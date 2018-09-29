import React, { PropTypes } from 'react';
import { cond, always, T, test } from 'ramda';
import { isNotEmpty } from 'helpers/ramda-ext';
import DateField from './DateField';
import { Well } from 'react-bootstrap';
import { isValidEvidenceUrl } from 'domain/statements';
import Dropzone from 'react-dropzone';
import FieldGroup from 'components/FieldGroup';

const isValidQuote = test(/(\w ?){15,}/);

const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotEmpty, always('error')],
  [T, always(null)],
]);

const getEvidenceUrlValidationState = getFieldValidationState(isValidEvidenceUrl);

const StatementStep = ({
  evidenceUrl, onUpdateEvidenceUrl,
  evidenceFile, onUpdateEvidenceFiles,
  evidenceSource, onUpdateEvidenceSource,
  quote, onUpdateQuote,
  date, onUpdateDate,
}) => (
  <Well>
    <h4>Donnez-nous quelques détails : </h4>

    <FieldGroup
      id="evidenceUrl"
      label="Lien internet ..."
      type="text"
      placeholder="http://"
      help="Un article en ligne, une vidéo, ..."
      value={evidenceUrl}
      validationState={getEvidenceUrlValidationState(evidenceUrl)}
      onChange={event => onUpdateEvidenceUrl(event.target.value)}
    />

    <Dropzone
      accept="application/pdf,image/*,audio/*,video/*"
      onDrop={onUpdateEvidenceFiles}
      multiple={false}
      maxSize={10000000}
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
      {!evidenceFile &&
        <span>
                      ... ou une pièce jointe : Déposez vos fichiers ici !
        </span>
      }
      {!!evidenceFile && <img height="64px" src={evidenceFile.preview} /> }
      {/* TODO file type icon instead of preview if not image type */ }
    </Dropzone>

    <FieldGroup
      id="evidenteName"
      label="Nom de la source"
      type="text"
      help="20h de TF1"
      value={evidenceSource}
      validationState={(evidenceSource && evidenceSource.length >= 3) ? 'success' : null}
      onChange={event => onUpdateEvidenceSource(event.target.value)}
    />

    <FieldGroup
      id="quote"
      label="Citation exacte"
      type="text"
      help="'Je souhaite défendre un truc'"
      value={quote}
      validationState={getFieldValidationState(isValidQuote)(quote)}
      onChange={event => onUpdateQuote(event.target.value)}
    />

    <DateField
      selected={date}
      onChange={onUpdateDate}
    />
  </Well>
);
StatementStep.propTypes = {
  evidenceUrl: PropTypes.string,
  evidenceFile: PropTypes.string,
  evidenceSource: PropTypes.string,
  quote: PropTypes.string,
  date: PropTypes.string,
  onUpdateEvidenceUrl: PropTypes.func.isRequired,
  onUpdateEvidenceFiles: PropTypes.func.isRequired,
  onUpdateEvidenceSource: PropTypes.func.isRequired,
  onUpdateQuote: PropTypes.func.isRequired,
  onUpdateDate: PropTypes.func.isRequired,
};

export default StatementStep;
