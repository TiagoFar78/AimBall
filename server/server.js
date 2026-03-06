import { WebSocketServer } from "ws";
import { createBall, createPlayer } from "./game/state.js";
import { updateGame, restartGame } from "./game/futsal_game.js";
import { CONSTANTS } from "../shared/constants.js";

const { MAX_PLAYERS, TICK_RATE } = CONSTANTS;

const wss = new WebSocketServer({ port: 8081 });

let state = {
    players: {},
    inputs: {},
    ball: createBall(),
    score: { left: 0, right: 0 },
    ballPossession: { team: 0, until: 0 }
};

wss.on("connection", (ws) => {
    const id = bookId();
    state.players[id] = createPlayer(id, id % 2);
    state.inputs[id] = {};

    ws.on("message", msg => {
        const data = JSON.parse(msg);
        if (data.type === "input") {
            state.inputs[id] = data.input;
        }
        else if (data.type === "setName") {
            if (typeof data.name === "string") {
                const name = data.name.trim().slice(0, 16);
                state.players[id].name = name;
            }
        }
        else if (data.type === "resetScore") {
            restartGame(state);
        }
        else if (data.type === "teams") {
            for (let playerId of data.teams[0]) {
                state.players[playerId].team = 0;
            }

            for (let playerId of data.teams[1]) {
                state.players[playerId].team = 1;
            }

            restartGame(state);
        }
    });

    ws.on("close", () => {
        delete state.players[id];
        delete state.inputs[id];
        freeId(id);

        const removePlayerMessage = JSON.stringify({ type: "removePlayer", id: id });
        wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN) {
                c.send(removePlayerMessage);
            }
        });
    });
});

setInterval(() => {
    updateGame(state);

    const snapshot = JSON.stringify({ type: "state", ...state });

    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
            c.send(snapshot);
        }
    });

}, 1000 / TICK_RATE);

// Ids

let bookedIds = [];

function bookId() {
    for (let i = 0; i < MAX_PLAYERS; i++) {
        if (!bookedIds.includes(i)) {
            bookedIds.push(i);
            return i;
        }
    }

    return -1;
}

function freeId(id) {
    delete bookedIds[bookedIds.indexOf(id)];
}
