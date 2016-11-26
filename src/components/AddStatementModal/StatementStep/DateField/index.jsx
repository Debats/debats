import React, { PropTypes, Component } from 'react';
import { always, cond, T } from 'ramda';
import moment from 'moment';
import FieldGroup from 'components/FieldGroup';
import { isNotNil } from 'helpers/ramda-ext';

const isValidDate = date => {
  const m = moment(date, 'DD-MM-YYYY', true);
  return m.isValid() && m.isSameOrBefore(moment(), 'day');
};
const getFieldValidationState = isValidFunc => cond([
  [isValidFunc, always('success')],
  [isNotNil, always('error')],
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
    this.setState({ typed });
    if (isValidDate(typed) && !moment(typed).isSame(this.props.selected, 'day'))
      this.props.onChange(moment(typed));
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
        value={this.state.typed || this.props.selected ? this.props.selected.format('DD/MM/YYYY') : ''}
        validationState={getFieldValidationState(isValidDate)(this.props.selected)}
        onChange={this.onChange}
      />
    );
  }
}

export default DateField;
