import axios from 'axios';

export const getSubjects = () => axios.get('http://localhost:3000/subjects');
export const getStatements = () => axios.get('http://localhost:3000/statements');
