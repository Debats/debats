import { urlRegex } from './generic';

export const isValidEvidenceUrl = (tested) => urlRegex.test(tested);
