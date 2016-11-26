import React, { PropTypes } from 'react';
import { propEq, prop, compose, find } from 'ramda';
import { Well } from 'react-bootstrap';

const SummaryStep = ({
  publicFigure, subject, position, date, evidenceUrl, evidenceFile, evidenceSource, quote, note, tags,
}) => (
    <Well>
        <h4>Pour résumer, vous dites que : </h4>
        <blockquote>
            <a>{date.calendar()}</a>,&nbsp;
            sur <a>{evidenceSource}</a> (<a>{evidenceUrl}</a>), &nbsp;
            <a>{publicFigure.name}</a> a déclaré&nbsp;
            <a>'{quote}'</a>,&nbsp;
            prenant ainsi position en faveur de <a>{position.title}</a>&nbsp;
            concernant <a>{subject.title}</a>.
        </blockquote>
        C'est tout bon ?
    </Well>
);
SummaryStep.propTypes = {
  publicFigure: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  subject: PropTypes.shape({ title: PropTypes.string.isRequired }).isRequired,
  position: PropTypes.number.isRequired,
  date: PropTypes.shape({ calendar: PropTypes.func.isRequired }).isRequired,
  evidenceUrl: PropTypes.string,
  evidenceFile: PropTypes.object,
  evidenceSource: PropTypes.string.isRequired,
  quote: PropTypes.string.isRequired,
  note: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
};

export default SummaryStep;
