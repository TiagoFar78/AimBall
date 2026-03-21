import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

import { createPlayer, removePlayer, applyPlayerInput, changeName, setTeams, updateGame, restartGame } from "./game/futsal_game.js";
import { bookId, freeId } from "./ids_manager.js";
import { CONSTANTS, MESSAGES_TYPES } from "../shared/constants.js";

const { INPUT_MESSAGE, SET_NAME_MESSAGE, RESET_SCORE_MESSAGE, TEAMS_MESSAGE } = MESSAGES_TYPES;

const { TICK_RATE } = CONSTANTS;

const app = express();
const PORT = 8081;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "../client")));
app.use("/shared", express.static(path.join(__dirname, "../shared")));

const server = app.listen(PORT, "0.0.0.0", () => { console.log("Server running on port", PORT); });
const wss = new WebSocketServer({ server });

const handlers = {
    [INPUT_MESSAGE]: (id, d) => applyPlayerInput(id, d.input),
    [SET_NAME_MESSAGE]: (id, d) => changeName(id, d.name.trim().slice(0, 16)),
    [RESET_SCORE_MESSAGE]: (id, d) => restartGame(),
    [TEAMS_MESSAGE]: (id, d) => setTeams(d.teams),
};

wss.on("connection", (ws) => {
    const id = bookId();
    createPlayer(id, id % 2);

    ws.on("message", msg => {
        const data = JSON.parse(msg);
        handlers[data.type]?.(id, data);
    });

    ws.on("close", () => {
        removePlayer(id);
        freeId(id);
    });
});

setInterval(() => {
    updateGame();
}, 1000 / TICK_RATE);

export function sendMessage(message) {
    const jsonMessage = JSON.stringify({ ...message });
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
            c.send(jsonMessage);
        }
    });
}
