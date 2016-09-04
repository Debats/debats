import { connect } from 'react-redux';
import { getHomeSubjects } from 'store/selectors';
import { onLastStatementsAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
    statements: getHomeSubjects(state),
});

const mapDispatchToProps = dispatch => ({
    onAccess: () => dispatch(onLastStatementsAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
