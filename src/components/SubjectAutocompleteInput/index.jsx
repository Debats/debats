import React, { Component, PropTypes } from 'react';
import { head, of, take, compose, when, prop, not, isNil, ifElse, always, map, pipe } from 'ramda';
import Typeahead from 'react-bootstrap-typeahead';
import { getSubjectsAutocomplete } from 'api/debats';
import { flattenAttributes } from 'api/jsonApiParser';
import { enrichWithRelationships } from 'store/selectors/entities';

import { withConsole } from 'helpers/debug';

const parseSubjects = raw => pipe(
    flattenAttributes,
    map(
        enrichWithRelationships('positions', 'positions', flattenAttributes(raw.included))
    )
)(raw.data);


class SubjectAutocompleteInput extends Component {

    static propTypes = {
        selected: PropTypes.object, // selected public figure entity
        onSelection: PropTypes.func.isRequired,
    };

    state = {
        suggestions: [],
    };

    loadSuggestions = (typed) => {
        if (!!this.props.selected) this.props.onSelection(null);
        if (!!typed.length)
            getSubjectsAutocomplete(typed)
                .then((response) => {
                    this.setState({
                        suggestions: parseSubjects(response.data),
                    });
                });
    };

    renderMenuItemChildren = (typeaheadProps, subject) => (
        <div>
            <p>{subject.title} </p>
            <small>{take(100)(subject.presentation)}</small>
        </div>
    );

    onSelection = (subject) => this.props.onSelection(
        compose(
            ifElse(
                compose(not, isNil),
                prop('id'),
                always(null)
            ),
            head
        )(subject)
    );

    render() {
        return (
            <Typeahead
                name="subject"
                options={this.state.suggestions}
                selected={of(this.props.selected)}
                emptyLabel="Aucun sujet correspondante"
                labelKey="title"
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

export default SubjectAutocompleteInput;
