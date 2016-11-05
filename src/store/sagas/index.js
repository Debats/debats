import { watchEntityAccess, watchSubjectSelection } from './apiSaga';


export default function* rootSaga() {
    yield [
        watchEntityAccess(),
        watchSubjectSelection()
    ];
}
