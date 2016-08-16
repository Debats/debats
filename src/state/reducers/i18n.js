/* <import * as ActionsType from '../constants/ActionsType'
import createReducer from '../utils/create-reducer'
import {configuration} from '../constants/AppConfiguration'

import Polyglot from 'node-polyglot'

const initialState = {
    fetched: false,
    fetching: false,
    current_lang: ''
};

const actionHandlers = {
    [ActionsType.LOAD_TRANSLATION_REQUEST]: (state, action) => {
      return {
        fetched: false,
        fetching: true,
      }
    },
    [ActionsType.REQUEST_TRANSLATION_SUCCESS]: (state, action) => {
        return {
            fetched : true,
            fetching: false,
            translation : new Polyglot({phrases: {...action.response}}),
            current_lang : action.response.lang
        }
    },
    [ActionsType.REQUEST_TRANSLATION_ERROR]: () => ({ fetched: false, fetching: false }),
};

export default createReducer(initialState, actionHandlers)
*/
