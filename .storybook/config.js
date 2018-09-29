import { configure, setAddon } from '@kadira/storybook';
import infoAddon from '@kadira/react-storybook-addon-info';

setAddon(infoAddon);

var API_URL = 'http://localhost:4000'

function loadStories() {
  require('./stories');
}

configure(loadStories, module);
