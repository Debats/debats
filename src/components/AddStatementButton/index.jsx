import React, { PropTypes, Component } from 'react';
import { Button } from 'react-bootstrap';
import AddStatementModal from 'components/AddStatementModal';
import connect from './connector';

class AddStatementButton extends Component {
  static propTypes = {
    onValidate: PropTypes.func.isRequired,
  };

  state = {
    showModal: false,
  };

  close = () => this.setState({ showModal: false });
  open = () => this.setState({ showModal: true });

  render() {
    return (
      <div>
        <Button
          bsStyle="primary"
          bsSize="xsmall"
          onClick={this.open}
        >
          Nouvelle prise de position
        </Button>
        <AddStatementModal show={this.state.showModal} onHide={this.close} onValidate={this.props.onValidate} />
      </div>
    );
  }
}

export default connect(AddStatementButton);
