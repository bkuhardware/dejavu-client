import * as ActionTypes from '_redux/actions/actionTypes';
import { access } from 'fs';

export default (state = null, action) => {
    switch(action.type) {
        case ActionTypes.SAVE_TRANSACTIONS:
            return [...action.payload];
        case ActionTypes.SAVE_OLD_TRANSACTIONS:
            return [
                ...state,
                ...action.payload
            ];
        case ActionTypes.RESET_TRANSACTIONS:
            return null;
        default:
            return state;
    }
};