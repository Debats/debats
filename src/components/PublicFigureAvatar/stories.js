import React from 'react';
// eslint-disable-next-line no-unused-vars
import { storiesOf, action, linkTo } from '@kadira/storybook';
import { withKnobs, text, boolean, number } from '@kadira/storybook-addon-knobs';
import PublicFigureAvatar from './';

const stories = storiesOf('PublicFigureAvatar', module);

stories.addDecorator(withKnobs);

stories.add('pony avatar', () => (
    <PublicFigureAvatar publicFigure={{ picture: { url: text('image url', 'http://tinyurl.com/jucz8b9') } }} />
));

stories.add('jake avatar', () => (
    <PublicFigureAvatar publicFigure={{ picture: { url: 'http://tinyurl.com/jb286jq' } }} />
));
