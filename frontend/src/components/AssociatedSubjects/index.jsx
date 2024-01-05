import React, { PropTypes } from 'react';

const getText = (nb) => {
  if (nb === 0)
    return 'Aucun sujet actif';
  else if (nb > 1)
    return `${nb}sujets actifs`;

  return '1 sujet actif';
};

const AssociatedSubjects = ({ publicFigure }) => (
  <h6 style={{ color: '#f21e40 !important' }}>{getText(publicFigure.nbActiveSubjects)}</h6>
);

AssociatedSubjects.propTypes = {
  publicFigure: PropTypes.object.isRequired,
};

export default AssociatedSubjects;
