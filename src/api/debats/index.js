import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
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
export const postStatement = statement => post('statements', statement);

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000' }),
  cache: new InMemoryCache()
})
