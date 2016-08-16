import React, { PropTypes } from 'react';
import HomeSubject from './HomeSubject';
import { map } from 'ramda';

const renderSubjects = map(s => <HomeSubject subject={s} />);

const HomeSubjects = ({ subjects }) => (renderSubjects(subjects));
HomeSubject.propTypes = {
    subjects: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default HomeSubjects;
