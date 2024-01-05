import React, { PropTypes, Component } from 'react';
import { always, cond, T } from 'ramda';
import moment from 'moment';
import FieldGroup from 'components/FieldGroup';
import { isNotEmpty } from 'helpers/ramda-ext';

const dateFormat = 'DD/MM/YYYY';

const isValidDate = date => {
  const m = moment(date, dateFormat, true);
  return m.isValid() && m.isSameOrBefore(moment(), 'day');
};
const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotEmpty, always('error')],
  [T, always(null)],
]);

class DateField extends Component {

  static propTypes = {
    selected: PropTypes.shape({
      format: PropTypes.func.isRequired,
    }),
    onChange: PropTypes.func.isRequired,
  };

  state = {
    typed: '',
  };

  onChange = event => {
    const typed = event.target.value;
    const m = moment(typed, dateFormat, true);
    this.setState({ typed });
    if (isValidDate(typed) && !m.isSame(this.props.selected, 'day'))
      this.props.onChange(m);
    else if (!isValidDate(typed))
      this.props.onChange(null);
  };

  render() {
    return (
      <FieldGroup
        id="date"
        label="Date des faits"
        type="text"
        placeholder="jj/mm/aaaa"
        help="Explication"
        value={this.state.typed || (this.props.selected ? this.props.selected.format(dateFormat) : '')}
        validationState={getFieldValidationState(isValidDate)(this.state.typed)}
        onChange={this.onChange}
      />
    );
  }
}

export default DateField;
