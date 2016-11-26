import jquery from 'jquery';
global.$ = jquery;
global.jQuery = jquery;

require('bootstrap-loader');

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

import '../src/components/general/Identity/stories';
import '../src/components/PublicFigureAvatar/stories';
import '../src/Main/Header/stories.js';
import '../src/components/AddStatementModal/stories';
