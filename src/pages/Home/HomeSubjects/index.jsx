import React, { PropTypes, Component } from 'react';
import HomeSubject from './HomeSubject';

class HomeSubjects extends Component {

    static propTypes = {
        subjects: PropTypes.arrayOf(PropTypes.object).isRequired,
    }

    render() {
        if (!this.props.subjects) return <span>loading subjects ...</span>;

        return this.props.subjects.map(
            s => <HomeSubject subject={s} />
        );
    }

}

export default HomeSubjects;
