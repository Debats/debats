import { connect } from 'react-redux';
import { getHomeSubjects } from 'store/selectors';
import { onHottestSubjectsAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
    subjects: getHomeSubjects(state),
});

const mapDispatchToProps = dispatch => ({
    onAccess: () => dispatch(onHottestSubjectsAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
