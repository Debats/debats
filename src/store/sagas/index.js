import { watchEntityAccess } from './apiSaga';
import { watchStatementValidation } from './postStatement';

export default function* rootSaga() {
  yield [
    watchEntityAccess(),
    watchStatementValidation(),
  ];
}
