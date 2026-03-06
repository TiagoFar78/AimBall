import { CONSTANTS } from "../../shared/constants.js";

const { ARENA_WIDTH, ARENA_HEIGHT, ONGOING_JOIN_SPAWN_DISTANCE } = CONSTANTS;

export function createBall() {
    return {
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT / 2,
        vx: 0,
        vy: 0
    };
}

export function createPlayer(id, team) {
    const teamZeroSpawn = ARENA_WIDTH / 2 * ONGOING_JOIN_SPAWN_DISTANCE;
    const teamOneSpawn = ARENA_WIDTH / 2 - teamZeroSpawn + ARENA_WIDTH;
    return {
        id: id,
        name: "Player" + id,
        team: team,
        x: team == 0 ? teamZeroSpawn : teamOneSpawn,
        y: ARENA_HEIGHT / 2,
        vx: 0,
        vy: 0,
        lastKick: 0
    };
}
