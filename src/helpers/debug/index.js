import { pipe } from 'ramda';

const print = message => (x) => {
  if (message) console.warn(message);
  return x;
};

const printWithPrefix = prefix => (x) => {
  console.warn('-------------------------------');
  console.warn(`---- ${prefix}: `, x);
  return x;
};

const printBefore = printWithPrefix('BEFORE');
const printAfter = printWithPrefix('AFTER');

export const withConsole = (f, message) => pipe(printBefore, print(message), f, printAfter);

export const log = (x) => { console.log(x); return x; }; /* eslint no-console: 0 */
export const warn = (x) => { console.warn(x); return x; }; /* eslint no-console: 0 */
