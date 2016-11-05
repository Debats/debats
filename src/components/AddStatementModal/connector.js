import { connect } from 'react-redux';
import {
    getAddStatementPublicFigure, getAddStatementSubject, getAddStatementPosition,
    getAddStatementEvidenceUrl, getAddStatementEvidenceFile
} from 'store/selectors';
import {
    onAddStatementPublicFigureSelection, onAddStatementSubjectSelection, onAddStatementPositionSelection,
    onAddStatementUpdateEvidenceUrl, onAddStatementUpdateEvidenceFile,
    onAddStatementValidate,
} from 'store/actions';

const mapStateToProps = state => ({
    selectedPublicFigure: getAddStatementPublicFigure(state),
    selectedSubject: getAddStatementSubject(state),
    selectedPosition: getAddStatementPosition(state),
    evidenceUrl: getAddStatementEvidenceUrl(state),
    evidenceFile: getAddStatementEvidenceFile(state),
});

const mapDispatchToProps = dispatch => ({
    onPublicFigureSelection: publicFigureId => dispatch(onAddStatementPublicFigureSelection(publicFigureId)),
    onSubjectSelection: publicFigureId => dispatch(onAddStatementSubjectSelection(publicFigureId)),
    onPositionSelection: publicFigureId => dispatch(onAddStatementPositionSelection(publicFigureId)),
    onUpdateEvidenceUrl: url => dispatch(onAddStatementUpdateEvidenceUrl(url)),
    onUpdateEvidenceFile: file => dispatch(onAddStatementUpdateEvidenceFile(file)),
    onValidate: () => dispatch(onAddStatementValidate()),
});

export default connect(mapStateToProps, mapDispatchToProps);
