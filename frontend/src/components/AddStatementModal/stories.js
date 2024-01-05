import React from 'react';
import { storiesOf, action } from '@kadira/storybook';
import { withKnobs, boolean } from '@kadira/storybook-addon-knobs';
import withReadme from 'storybook-readme/with-readme';

import AddStatementModal from './';
// import README from './README.md';

const stories = storiesOf('AddStatementModal', module);

stories.addDecorator(withKnobs);

stories.addWithInfo(
  'Empty',
  'Everything has to be input',
  withReadme('README',
    () => (
      <AddStatementModal show={boolean('show', true)} onHide={action('onHide')} onValidate={action('onValidate')}/>
    )
  )
);

stories.addWithInfo(
  'with publicFigue',
  'Starts at step 2',
  withReadme('README',
    () => (
      <AddStatementModal
        show={boolean('show', true)}
        onHide={action('onHide')}
        onValidate={action('onValidate')}
        publicFigure={{ id: 1, name: 'Ambroise Croizat' }}
      />
    )
  )
);

stories.addWithInfo(
  'with publicFigue, subject and position given',
  'Starts at step 4',
  withReadme('README',
    () => (
      <AddStatementModal
        show={boolean('show', true)}
        onHide={action('onHide')}
        onValidate={action('onValidate')}
        publicFigure={{ id: 1, name: 'Ambroise Croizat' }}
        subject={{
          id: 1,
          title: 'Le régime de sécurité sociale',
          positions: [
            { id: 1, title: 'Auto-gérée par les salariés' },
          ],
        }}
        position={1}
      />
    )
  )
);
