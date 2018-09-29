/* eslint-disable import/imports-first */
import moment from 'moment';
moment.locale('fr');
moment.locale('fr', {
  calendar : {
    lastDay : '[Hier]',
    sameDay : '[Aujourd\'hui]',
    nextDay : '[Demain]',
    lastWeek : 'dddd [dernier]',
    nextWeek : 'dddd',
    sameElse : 'L',
  },
});


import '../src/styles/typo.css';

import '../src/Main/Header/stories.jsx';
import '../src/components/Identity/stories';
import '../src/components/PublicFigureAvatar/stories';
import '../src/components/AddStatementModal/stories';
