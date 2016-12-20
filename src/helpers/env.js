import { complement } from 'ramda';

export const hasWindow = () => (typeof window !== 'undefined');
export const isClientSide = hasWindow;
export const isServerSide = complement(hasWindow);
