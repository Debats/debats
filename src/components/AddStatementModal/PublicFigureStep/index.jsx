import React, { PropTypes, Component } from 'react';
import { FormGroup, ControlLabel, FormControl, Well } from 'react-bootstrap';
import { ifElse, propEq, when, complement, isNil } from 'ramda';
import PublicFigureAutocompleteInput from 'components/PublicFigureAutocompleteInput';
import NewPublicFigureForm from './NewPublicFigureForm';

const whenNotNil = when(complement(isNil));

class PublicFigureStep extends Component {

  static propTypes = {
    selected: PropTypes.object, // public figure entity
    onSelection: PropTypes.func.isRequired,
  };

  state = {
    showForm: false,
  };

  onAutoCompleteSelection = selection => whenNotNil(
    ifElse(
      propEq('customOption', true),
      this.showAddForm,
      this.props.onSelection
    )
  )(selection);

  onFormChange = fields => {
    this.setState(fields);
  };

  showAddForm = selection => {
    this.setState({
      showForm: true,
      name: selection.name,
    });
  };

  hideAddForm = () => {
    this.setState({
      showForm: false,
    });
    // this.autoCompleteInput.focus(); FIXME ==> JAR : Does not work because undefined when needed.
  };

  render() {
    console.log('jarfaoui', 'render', this.autoCompleteInput);
    return (
      <Well>
        <FormGroup controlId="publicFigureSelect" validationState={!!this.props.selected ? 'success' : undefined}>
          <ControlLabel>De qui parlons-nous ?</ControlLabel>
          {!this.state.showForm &&
            <PublicFigureAutocompleteInput
              ref={r => {this.autoCompleteInput = r}}
              selected={this.props.selected}
              onSelection={this.onAutoCompleteSelection}
            />}
          {this.state.showForm &&
            <NewPublicFigureForm
              name={this.state.name}
              onChange={this.onFormChange}
              onCancel={this.hideAddForm}
            />}
          <FormControl.Feedback />
        </FormGroup>
      </Well>
    );
  }
}

export default PublicFigureStep;
