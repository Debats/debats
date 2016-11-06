import { connect } from 'react-redux';
import { getPublicFiguresWithRelations } from 'store/selectors';
import { onPublicFiguresListAccess } from 'store/actions/entities';

const mapStateToProps = state => ({
  publicFigures: getPublicFiguresWithRelations(state),
});

const mapDispatchToProps = dispatch => ({
  onAccess: () => dispatch(onPublicFiguresListAccess()),
});

export default connect(mapStateToProps, mapDispatchToProps);
