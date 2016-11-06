import React, { Component, PropTypes } from 'react';
import { head, of, compose, when, prop, not, isNil } from 'ramda';
import Typeahead from 'react-bootstrap-typeahead';
import { getPublicFiguresAutocomplete } from 'api/debats';
import { flattenAttributes } from 'api/jsonApiParser';
import PublicFigureAvatar from 'components/PublicFigureAvatar';

class PublicFigureAutocompleteInput extends Component {

  static propTypes = {
    selected: PropTypes.object, // selected public figure entity
    onSelection: PropTypes.func.isRequired,
  };

  state = {
    suggestions: [],
  }

  onSelection = pf => this.props.onSelection(
        compose(
            when(
                compose(not, isNil),
                prop('id')
            ),
            head
        )(pf)
    );

  loadSuggestions = (typed) => {
    if (this.props.selected) this.props.onSelection(null);
    if (typed.length) {
      getPublicFiguresAutocomplete(typed)
                .then((response) => {
                  this.setState({
                    suggestions: flattenAttributes(response.data.data),
                  });
                }); }
  };

  renderMenuItemChildren = (typeaheadProps, publicFigure) => (
    <div>
      <PublicFigureAvatar publicFigure={publicFigure} />
      <span>{publicFigure.name}</span>
    </div>
  );

  render() {
    return (
      <Typeahead
        name="publicFigure"
        options={this.state.suggestions}
        selected={of(this.props.selected)}
        emptyLabel="Aucune personnalité correspondante"
        labelKey="name"
        minLength={3}
        allowNew
        newSelectionPrefix="Ajouter "
        onChange={this.onSelection}
        onInputChange={this.loadSuggestions}
        renderMenuItemChildren={this.renderMenuItemChildren}
      />
    );
  }

}

export default PublicFigureAutocompleteInput;
