import { connect } from 'react-redux';
import { onAddStatementValidate } from 'store/actions';

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => ({
  onValidate: statement => dispatch(onAddStatementValidate(statement)),
});

export default connect(mapStateToProps, mapDispatchToProps);
