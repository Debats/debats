/* eslint-disable no-unused-vars */
import React from 'react';

import { storiesOf, action, linkTo } from '@kadira/storybook';
import { withKnobs, text, boolean, number } from '@kadira/storybook-addon-knobs';
import withReadme from 'storybook-readme/with-readme';

import PublicFigureAvatar from './';
import README from './README.md';

const stories = storiesOf('PublicFigureAvatar', module);

stories.addDecorator(withKnobs);

stories.addWithInfo(
  'pony avatar',
  'Description of the story',
  withReadme(README,
    () => (
      <PublicFigureAvatar publicFigure={{ picture: { url: text('image url', 'http://tinyurl.com/jucz8b9') } }} />
        )
    )
);

stories.add('jake avatar', () => (
  <PublicFigureAvatar publicFigure={{ picture: { url: 'http://tinyurl.com/jb286jq' } }} />
));
