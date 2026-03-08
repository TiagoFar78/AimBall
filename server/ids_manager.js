import { CONSTANTS } from "../shared/constants.js";

const { MAX_PLAYERS } = CONSTANTS;

let bookedIds = [];

export function bookId() {
    for (let i = 0; i < MAX_PLAYERS; i++) {
        if (!bookedIds.includes(i)) {
            bookedIds.push(i);
            return i;
        }
    }

    return -1;
}

export function freeId(id) {
    delete bookedIds[bookedIds.indexOf(id)];
}
