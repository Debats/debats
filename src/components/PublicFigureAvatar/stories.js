import React from 'react';
// eslint-disable-next-line no-unused-vars
import { storiesOf, action, linkTo } from '@kadira/storybook';
import PublicFigureAvatar from './';

storiesOf('PublicFigureAvatar', module)
    .add('pony avatar', () => (
        <PublicFigureAvatar publicFigure={{ picture: { url: 'http://tinyurl.com/jucz8b9' } }} />
    ))
    .add('jake avatar', () => (
        <PublicFigureAvatar publicFigure={{ picture: { url: 'http://tinyurl.com/jb286jq' } }} />
    ));
