import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import { withKnobs, text, boolean, number } from '@kadira/storybook-addon-knobs';
import withReadme from 'storybook-readme/with-readme';

import AddStatementModal from './';
// import README from './README.md';

const stories = storiesOf('AddStatementModal', module);

stories.addDecorator(withKnobs);

stories.addWithInfo(
    'AddStatementModal',
    'Description of the story',
    withReadme('README',
        () => (
            <AddStatementModal show={boolean('show', true)} onHide={action('onHide')} onValidate={action('onValidate')} />
        )
    )
);
