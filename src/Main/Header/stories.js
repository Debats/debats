import React from 'react';
// eslint-disable-next-line no-unused-vars
import { storiesOf, action, linkTo } from '@kadira/storybook';
import { withKnobs, text, boolean, number } from '@kadira/storybook-addon-knobs';

import Header from './';

const stories = storiesOf('Header', module);

stories.addDecorator(withKnobs);

stories.addWithInfo(
    'default header',
    'Description of the story',
    () => (
        <Header />
    )
);
