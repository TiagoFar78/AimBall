import { WebSocketServer } from "ws";
import { createBall, createPlayer } from "./game/state.js";
import { updateGame } from "./game/futsal_game.js";
import { CONSTANTS } from "../shared/constants.js";

const { TICK_RATE } = CONSTANTS;

const wss = new WebSocketServer({ port: 8081 });

let state = {
    players: {},
    inputs: {},
    ball: createBall(),
    score: { left: 0, right: 0 }
};

wss.on("connection", (ws) => {
    const id = Date.now() + Math.random();
    state.players[id] = createPlayer();
    state.inputs[id] = {};

    ws.on("message", msg => {
        const data = JSON.parse(msg);
        if (data.type === "input") {
            state.inputs[id] = data.input;
        }
    });

    ws.on("close", () => {
        delete state.players[id];
        delete state.inputs[id];
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