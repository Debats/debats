import { connect } from 'react-redux';
import { getHomeSubjectsWithRelations } from 'store/selectors';
import { onHottestSubjectsAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
    subjects: getHomeSubjectsWithRelations(state),
});

const mapDispatchToProps = dispatch => ({
    onAccess: () => dispatch(onHottestSubjectsAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
