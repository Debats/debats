import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import AddStatementModal from 'components/AddStatementModal';

class AddStatementButton extends Component {
  state = {
    showModal: false,
  }

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
        <AddStatementModal show={this.state.showModal} onHide={this.close} />
      </div>
    );
  }
}

export default AddStatementButton;
