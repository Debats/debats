import { compose, not, isNil, isEmpty, when } from 'ramda';

export const isNotNil = compose(not, isNil);
export const isNotEmpty = compose(not, isEmpty);
export const whenNotNil = when(isNotNil);

