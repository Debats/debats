import { connect } from 'react-redux';
import Config from 'Config';
import { getStatements } from 'store/selectors';
import { onLastStatementsAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
    statements: getStatements(state),
});

const mapDispatchToProps = dispatch => ({
    onAccess: () => dispatch(onLastStatementsAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
