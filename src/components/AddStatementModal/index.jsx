import React, { PropTypes, Component } from 'react';
import { Modal, Button, ProgressBar } from 'react-bootstrap';
import { identity, compose } from 'ramda';
import './AddStatementModal.css';
import PublicFigureStep from './PublicFigureStep';
import SubjectStep from './SubjectStep';
import PositionStep from './PositionStep';
import StatementStep from './StatementStep';
import SummaryStep from './SummaryStep';
import connect from './connector';
import steps from 'constants/addStatementSteps';

class AddStatementModal extends Component {

  static propTypes = {
    show: PropTypes.bool,
    onHide: PropTypes.func.isRequired,
    selectedPublicFigure: PropTypes.object,
    selectedSubject: PropTypes.object,
    selectedPosition: PropTypes.object,
    onPublicFigureSelection: PropTypes.func.isRequired,
    onSubjectSelection: PropTypes.func.isRequired,
    onPositionSelection: PropTypes.func.isRequired,
    onValidate: PropTypes.func.isRequired,
  };

  componentWillMount() {
    this.autoDetectStep(this.props);
  }

  autoDetectStep = (props) => {
    if (!props.selectedPublicFigure) this.setState({ step: steps.PUBLIC_FIGURE });
    if (!props.selectedSubject) this.setState({ step: steps.PUBLIC_FIGURE });
    if (!props.selectedPosition) this.setState({ step: steps.PUBLIC_FIGURE });
    if (!props.isStatementComplete) this.setState({ step: steps.PUBLIC_FIGURE });
    if (!props.selectedPublicFigure) this.setState({ step: steps.PUBLIC_FIGURE });
    if (!props.selectedPublicFigure) this.setState({ step: steps.PUBLIC_FIGURE });
  }

    /* const isPublicFigureStep = compose(equals(steps.PUBLIC_FIGURE), prop('step'));
    const isSubjectStep = compose(equals(steps.SUBJECT), prop('step'));
    const isPositionStep = compose(equals(steps.POSITION), prop('step'));
    const isStatementStep = compose(equals(steps.STATEMENT), prop('step'));
    const isSummaryStep = compose(equals(steps.SUMMARY), prop('step')); */

  hasIncompleteStepAfterCurrent = () => {
    if (this.state.step === steps.PUBLIC_FIGURE)
      return (!(this.props.selectedSubject && this.props.seletedPosition && this.props.isStatementComplete));
    if (this.state.step === steps.SUBJECT)
      return (!(this.props.seletedPosition && this.props.isStatementComplete));
    if (this.state.step === steps.POSITION)
      return (!this.props.isStatementComplete);
    return false;
  }

  hasIncompleteStep = () => !(
        this.props.isPublicFigureChosen && this.props.isSubjectChosen && this.props.isPositionChosen && this.props.isStatementComplete
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
      this.setState({ step: this.firstIncompleteStepAfterCurrent() });
    else if (this.hasIncompleteStep())
      this.setState({ step: this.firstIncompleteStep() });
    else if (this.state.step < steps.SUMMARY)
      this.setState({ step: this.state.step + 1 });
  }

  previousStep = () => {
    this.setState({ step: this.state.step - 1 });
  }

  renderStepContent = () => {
    switch (this.state.step) {
      case steps.PUBLIC_FIGURE: return (
        <PublicFigureStep
            selected={this.props.selectedPublicFigure}
            onSelection={this.props.onPublicFigureSelection}
        />
      );
      case steps.SUBJECT: return (
        <SubjectStep
            selected={this.props.selectedSubject}
            onSelection={this.props.onSubjectSelection}
        />
      );
      case steps.POSITION: return (
        <PositionStep
            subject={this.props.selectedSubject}
            selected={this.props.selectedPosition}
            onSelection={this.props.onPositionSelection}
        />
      );
      case steps.STATEMENT: return (
        <StatementStep
            evidenceUrl={this.props.evidenceUrl}
            onUpdateEvidenceUrl={this.props.onUpdateEvidenceUrl}
            evidenceFile={this.props.evidenceFile}
            onUpdateEvidenceFil={this.props.onUpdateEvidenceFil}
        />
      );
      case steps.SUMMARY: return (
        <SummaryStep />
      );
    }
  }

  render() {
    const {
            show,
            onHide,
            onValidate,
            isValidationReady,
        } = this.props;
    const { step } = this.state;

    return (
      <div className="static-modal">
        <Modal show={show} onHide={identity}>

          <Modal.Header>
            <Modal.Title>Ajouter une prise de position</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <ProgressBar max={5} now={step} />
            {this.renderStepContent()}
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={onHide} bsStyle="warning">Annuler</Button>
            {step > steps.PUBLIC_FIGURE &&
              <Button onClick={this.previousStep}>Revenir</Button>}
            {step !== steps.SUMMARY &&
              <Button
                  onClick={this.nextStep}
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

export default connect(AddStatementModal);
