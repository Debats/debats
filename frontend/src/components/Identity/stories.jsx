/* eslint-disable no-unused-vars */
import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import Identity from './';

storiesOf('Identity', module)
  .add('simple text', () => (
    <Identity>Hello</Identity>
  ));
