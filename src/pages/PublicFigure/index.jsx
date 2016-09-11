import React, { PropTypes } from 'react';
import paths from 'constants/paths';
import { Link } from 'react-router';
import React, { PropTypes } from 'react';
import PublicFigureAvatar from 'components/PublicFigureAvatar';
import AssociatedSubjects from 'components/AssociatedSubjects';
import PublicFigureStyle from './PublicFigure.css';
import cssModules from 'react-css-modules';

const PublicFigure = ({ publicFigure }) => (
    <table className="table">
        <tbody>
        <ul id="subject">
            <li>

                <tr>
                    <td>
                        <PublicFigureAvatar publicFigure={publicFigure} />
                    </td>
                <td style= {{ width: "33%;" }}>

                    <h2 className="figure-title" style={{ color: "#333333 !important;" }}>
                        <Link to="{paths.getFor.subject(publicFigure)}">
                            {publicFigure.name}
                        </Link>
                    </h2>
                    <AssociatedSubjects publicFigure={publicFigure} />
            </td>

            <td styleName="presentationWrapper">
                <p className="figure-presentation-text" styleName="presentation"> {publicFigure.presentation}</p>
            </td>
        </tr>
        </li>
    </ul>
</tbody>
</table>
);

PublicFigure.propTypes = {
    publicFigure: PropTypes.object.isRequired
};

export default cssModules(PublicFigure, PublicFigureStyle);

/*
<script type="text/javascript">
    $(document).ready(function() {

    $(".figure-presentation-text").shorten();

});
</script>
    */
