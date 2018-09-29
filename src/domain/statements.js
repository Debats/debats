import { urlRegex } from 'validations/generic'

export const isValidEvidenceUrl = tested => urlRegex.test(tested)
