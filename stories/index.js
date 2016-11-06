/* eslint-disable import/imports-first */
import jquery from 'jquery';

global.$ = jquery;
global.jQuery = jquery;

require('bootstrap-loader');

import '../src/styles/typo.css';

import '../src/components/Identity/stories';
import '../src/components/PublicFigureAvatar/stories';
import '../src/Main/Header/stories';
