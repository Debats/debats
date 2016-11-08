import React, {PropTypes, Component} from 'react';
import {Modal, Button, ProgressBar} from 'react-bootstrap';
import {
  identity, append, reject, equals, trim, allPass, prop, compose, test, ifElse, isNil, always, head
} from 'ramda';
import './AddStatementModal.css';
import PublicFigureStep from './PublicFigureStep';
import SubjectStep from './SubjectStep';
import PositionStep from './PositionStep';
import StatementStep from './StatementStep';
import SummaryStep from './SummaryStep';
import {QUOTE_MIN_CHARS} from 'constants/limits';
import {isValidEvidenceUrl} from 'validations/statements';

import {withConsole} from 'helpers/debug';

const steps = {
  PUBLIC_FIGURE: 1,
  SUBJECT: 2,
  POSITION: 3,
  STATEMENT: 4,
  SUMMARY: 5,
};

const { bool, func, shape, number, string, arrayOf } = PropTypes;

class AddStatementModal extends Component {

  static propTypes = {
    show: bool,
    onHide: func.isRequired,
    onValidate: func.isRequired,
    publicFigure: shape({ id: number, name: string }),
    subject: shape({ id: number, title: string, position: arrayOf(shape({ id: number, title: string })) }),
    position: number,
  };

  state = {
    publicFigure: null,
    subject: null,
    position: null,
    date: null,
    evidenceUrl: null,
    evidenceFile: null,
    evidenceSource: null,
    quote: '',
    note: null,
    tags: [],
  };

  componentWillMount() {
    this.autoDetectStep();
  }

  autoDetectStep = () => {
    if (!this.isPublicFigureComplete())
      this.setState({step: steps.PUBLIC_FIGURE});
    else if (!this.isSubjectComplete())
      this.setState({step: steps.SUBJECT});
    else if (!this.isPositionComplete())
      this.setState({step: steps.POSITION});
    else if (!this.isStatementComplete())
      this.setState({step: steps.STATEMENT});
    else
      this.setState({step: steps.SUMMARY});
  };

  getSelectedPublicFigure = () => (this.props.publicFigure || this.state.publicFigure);
  getSelectedSubject = () => (this.props.subject || this.state.subject);
  getSelectedPosition = () => (this.props.position || this.state.position);

  isPublicFigureComplete = () => ifElse(
    isNil,
    always(false),
    allPass([
      compose(test(/^\d$/), prop('id')),
      // other props control
    ])
  )(this.getSelectedPublicFigure());

  isSubjectComplete = () => ifElse(
    isNil,
    always(false),
    allPass([
      compose(test(/^\d$/), prop('id')),
      // other props control
    ])
  )(this.getSelectedSubject());

  isPositionComplete = () => test(/^\d$/, this.getSelectedPosition());

  isStatementComplete = () => (this.isEvidenceValid() && this.isQuoteValid());

  isEvidenceValid = () => this.isEvidenceUrlValid() || this.isEvidenceFileValid();
  isEvidenceUrlValid = () => isValidEvidenceUrl(this.state.evidenceUrl);
  isEvidenceFileValid = () => true;
  isQuoteValid = () => trim(this.state.quote).length > QUOTE_MIN_CHARS;

  onSubject = subject => this.setState({subject});
  onPublicFigure = publicFigure => this.setState({publicFigure});
  onPosition = position => this.setState({position});
  onDate = date => this.setState({date});
  onEvidenceUrl = evidenceUrl => this.setState({evidenceUrl});
  onEvidenceFiles = evidenceFiles => this.setState({evidenceFile: head(evidenceFiles)});
  onEvidenceSource = source => this.setState({ evidenceSource: source });
  onQuote = quote => this.setState({quote});
  onNote = note => this.setState({note});
  onAddTag = tag => this.setState({tags: append(tag, this.state.tags)});
  onRemoveTag = tag => this.setState({tags: reject(equals(tag), this.state.tags)});

  /* const isPublicFigureStep = compose(equals(steps.PUBLIC_FIGURE), prop('step'));
   const isSubjectStep = compose(equals(steps.SUBJECT), prop('step'));
   const isPositionStep = compose(equals(steps.POSITION), prop('step'));
   const isStatementStep = compose(equals(steps.STATEMENT), prop('step'));
   const isSummaryStep = compose(equals(steps.SUMMARY), prop('step')); */

  hasIncompleteStepAfterCurrent = () => {
    if (this.state.step === steps.PUBLIC_FIGURE)
      return (!(this.getSelectedSubject() && this.getSelectedPosition() && this.isStatementComplete()));
    if (this.state.step === steps.SUBJECT)
      return (!(this.getSelectedPosition() && this.isStatementComplete()));
    if (this.state.step === steps.POSITION)
      return (!this.isStatementComplete());
    return false;
  }

  hasIncompleteStep = () => !(
    this.isPublicFigureComplete()
    && this.isSubjectComplete()
    && this.isPositionComplete()
    && this.isStatementComplete()
  );

  isCurrentStepBefore = otherStep => this.state.step < otherStep;

  firstIncompleteStepAfterCurrent = () => {
    if (!this.props.selectedSubject && this.isCurrentStepBefore(steps.SUBJECT))
      return steps.SUBJECT;
    else if (!this.props.selectedPosition && this.isCurrentStepBefore(steps.POSITION))
      return steps.POSITION;
    else if (!this.props.isStatementComplete && this.isCurrentStepBefore(steps.STATEMENT))
      return steps.STATEMENT;
    return steps.SUMMARY;
  }

  firstIncompleteStep = () => {
    if (!this.props.selectedSubject)
      return steps.SUBJECT;
    else if (!this.props.selectedPosition)
      return steps.POSITION;
    else if (!this.props.isStatementComplete)
      return steps.STATEMENT;
    return steps.SUMMARY;
  }

  nextStep = () => {
    if (this.hasIncompleteStepAfterCurrent())
      this.setState({step: this.firstIncompleteStepAfterCurrent()});
    else if (this.hasIncompleteStep())
      this.setState({step: this.firstIncompleteStep()});
    else if (this.state.step < steps.SUMMARY)
      this.setState({step: this.state.step + 1});
  };

  previousStep = () => {
    this.setState({step: this.state.step - 1});
  };

  canGoNext = () => {
    switch (this.state.step) {
      case steps.PUBLIC_FIGURE:
        return this.isPublicFigureComplete();
      case steps.SUBJECT:
        return this.isSubjectComplete();
      case steps.POSITION:
        return this.isPositionComplete();
      case steps.STATEMENT:
        return this.isStatementComplete();
      default:
        return true;
    }
  };

  renderStepContent = () => {
    switch (this.state.step) {
      case steps.PUBLIC_FIGURE:
        return (
          <PublicFigureStep
            selected={this.getSelectedPublicFigure()}
            onSelection={this.onPublicFigure}
          />
        );
      case steps.SUBJECT:
        return (
          <SubjectStep
            selected={this.getSelectedSubject()}
            onSelection={this.onSubject}
          />
        );
      case steps.POSITION:
        return (
          <PositionStep
            subject={this.getSelectedSubject()}
            selected={this.getSelectedPosition()}
            onSelection={this.onPosition}
          />
        );
      case steps.STATEMENT:
        return (
          <StatementStep
            evidenceUrl={this.state.evidenceUrl}
            evidenceFile={this.state.evidenceFile}
            evidenceSource={this.state.evidenceSource}
            onUpdateEvidenceUrl={this.onEvidenceUrl}
            onUpdateEvidenceFiles={this.onEvidenceFiles}
            onUpdateEvidenceSource={this.onEvidenceSource}
          />
        );
      case steps.SUMMARY:
        return (
          <SummaryStep />
        );
    }
  }

  render() {
    const {
      show,
      onHide,
      onValidate,
      isValidationReady
    } = this.props;
    const {step} = this.state;

    return (
      <div className="static-modal">
        <Modal show={show} onHide={identity}>

          <Modal.Header>
            <Modal.Title>Ajouter une prise de position</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <ProgressBar max={5} now={step}/>
            {this.renderStepContent()}
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={onHide} bsStyle="warning">Annuler</Button>
            {step > steps.PUBLIC_FIGURE &&
            <Button onClick={this.previousStep}>Revenir</Button>}
            {step !== steps.SUMMARY &&
            <Button
              onClick={this.nextStep}
              disabled={!this.canGoNext()}
              bsStyle="primary"
            >
              Confirmer
            </Button>
            }
            {step === steps.SUMMARY &&
            <Button
              onClick={onValidate}
              disabled={!isValidationReady}
              bsStyle="success"
            >
              Valider
            </Button>
            }
          </Modal.Footer>

        </Modal>
      </div>
    );
  }
}

export default AddStatementModal;
