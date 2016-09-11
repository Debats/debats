import { compose, not, isNil, when } from 'ramda';

export const isNotNil = compose(not, isNil);
export const whenNotNil = when(isNotNil);

