import { CONSTANTS } from "../../shared/constants.js";

const { ARENA_WIDTH, ARENA_HEIGHT } = CONSTANTS;

export function createBall() {
    return {
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT / 2,
        vx: 0,
        vy: 0
    };
}

export function createPlayer() {
    return {
        x: 200 + Math.random() * 400,
        y: 150 + Math.random() * 200,
        vx: 0,
        vy: 0,
        lastKick: 0
    };
}
