import { watchEntityAccess } from './apiSaga';


export default function* rootSaga() {
    yield [
        watchEntityAccess(),
    ];
}
