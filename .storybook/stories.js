import jquery from 'jquery';
global.$ = jquery;
global.jQuery = jquery;

require('bootstrap-loader');

import '../src/styles/typo.css';

import '../src/components/general/Identity/stories';
import '../src/components/PublicFigureAvatar/stories';
import '../src/Main/Header/stories.js';
import '../src/components/AddStatementModal/stories';
