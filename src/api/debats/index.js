/* eslint-disable no-unused-vars */

import { curry } from 'ramda';
import axios from 'axios';
import Config from 'Config';

const endpoint = Config.api.debats.endpointHost + Config.api.debats.endpointPath;

const get = url => axios.get(`${endpoint}${url}`);
const post = (url, data) => axios.post(`${endpoint}${url}`, data);

export const getSubjects = () => get('subjects');
export const getStatements = () => get('statements');

export const getPublicFiguresAutocomplete = typed => get(`autocomplete/public_figure/${typed}`);
export const getSubjectsAutocomplete = typed => get(`autocomplete/subject/${typed}`);
export const getPositions = subjectId => get(`subjects/${subjectId}/positions`);
