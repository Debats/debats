import jquery from 'jquery';

global.$ = jquery;
global.jQuery = jquery;

require('bootstrap-loader');

import '../src/styles/typo.css';

import '../src/components/general/Identity/stories.js';
import '../src/components/PublicFigureAvatar/stories.js';
import '../src/Main/Header/stories.js';
