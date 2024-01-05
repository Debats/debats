import moment from 'moment';

const locale = 'fr';
moment.locale(locale);
moment.locale(locale, {
  calendar : {
    lastDay : '[Hier]',
    sameDay : '[Aujourd\'hui]',
    nextDay : '[Demain]',
    lastWeek : 'dddd [dernier]',
    nextWeek : 'dddd',
    sameElse : 'L',
  },
});

// Install ImmutableDevTools
if (process.env.NODE_ENV !== 'production') { // DEBUG/DEV MODE
  const Immutable = require('immutable');
  const installDevTools = require('immutable-devtools').default;

  installDevTools(Immutable);
}
