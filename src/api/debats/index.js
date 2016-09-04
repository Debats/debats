import axios from 'axios';
import Config from 'Config';

const endpoint = Config.api.debats.endpointHost + Config.api.debats.endpointPath;

export const getSubjects = () => axios.get(`${endpoint}subjects`);
export const getStatements = () => axios.get(`${endpoint}statements`);
