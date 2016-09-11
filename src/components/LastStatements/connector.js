import { connect } from 'react-redux';
import { getLatestStatements } from 'store/selectors';
import { onLastStatementsAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
    statements: getLatestStatements(state),
});

const mapDispatchToProps = dispatch => ({
    onAccess: () => dispatch(onLastStatementsAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
