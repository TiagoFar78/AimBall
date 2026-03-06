import { CONSTANTS } from "../../shared/constants.js";

const {
    MAX_PLAYERS,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    PLAYER_OUT_MARGIN,
    GOAL_WIDTH,
    GOAL_DEPTH,
    MIDDLE_CIRCLE_RADIUS,
    POST_RADIUS,
    BALL_RADIUS,
    KICK_SPEED,
    KICK_COOLDOWN_MILLIS,
    BALL_FRICTION,
    PLAYER_RADIUS,
    PLAYER_ACCELERATION,
    PLAYER_FRICTION,
    PLAYER_MAX_SPEED,
    SPAWN_DISTANCE_RELATIVE,
    FIELD_PLAYER_SPAWN_ANGLE,
    POSSESSION_SECONDS,
    GOAL_CELEBRATION_SECONDS
} = CONSTANTS;

const goalTop = (ARENA_HEIGHT / 2) - (GOAL_WIDTH / 2);
const goalBottom = (ARENA_HEIGHT / 2) + (GOAL_WIDTH / 2);

const spawnDistanceFromCenter = SPAWN_DISTANCE_RELATIVE * ARENA_WIDTH / 2;
const teamsSpawns = [[
    { x: ARENA_WIDTH / 2 - spawnDistanceFromCenter, y: ARENA_HEIGHT / 2 },
    { x: ARENA_WIDTH / 2 - spawnDistanceFromCenter * Math.cos(FIELD_PLAYER_SPAWN_ANGLE), y: ARENA_HEIGHT / 2 + spawnDistanceFromCenter * Math.sin(FIELD_PLAYER_SPAWN_ANGLE) },
    { x: ARENA_WIDTH / 2 - spawnDistanceFromCenter * Math.cos(FIELD_PLAYER_SPAWN_ANGLE), y: ARENA_HEIGHT / 2 - spawnDistanceFromCenter * Math.sin(FIELD_PLAYER_SPAWN_ANGLE) },
], [
    { x: ARENA_WIDTH / 2 + spawnDistanceFromCenter, y: ARENA_HEIGHT / 2 },
    { x: ARENA_WIDTH / 2 + spawnDistanceFromCenter * Math.cos(FIELD_PLAYER_SPAWN_ANGLE), y: ARENA_HEIGHT / 2 + spawnDistanceFromCenter * Math.sin(FIELD_PLAYER_SPAWN_ANGLE) },
    { x: ARENA_WIDTH / 2 + spawnDistanceFromCenter * Math.cos(FIELD_PLAYER_SPAWN_ANGLE), y: ARENA_HEIGHT / 2 - spawnDistanceFromCenter * Math.sin(FIELD_PLAYER_SPAWN_ANGLE) },
]];

function handleCollisionSingle(movableObject, limit, bounce, axis, axisVelocity, compareFunc) {
    if (compareFunc(movableObject[axis], limit)) {
        movableObject[axis] = limit;
        movableObject[axisVelocity] *= -bounce;
    }
}

function handleCollision(movableObject, min, max, bounce, axis, axisVelocity) {
    handleCollisionSingle(movableObject, min, bounce, axis, axisVelocity, (d, r) => d < r);
    handleCollisionSingle(movableObject, max, bounce, axis, axisVelocity, (d, r) => d > r);
}

function handleCollisionOnX(movableObject, min, max, bounce) {
    handleCollision(movableObject, min, max, bounce, 'x', 'vx');
}

function handleCollisionOnY(movableObject, min, max, bounce) {
    handleCollision(movableObject, min, max, bounce, 'y', 'vy');
}

function handleCollisionWithCircle(movableObject, cx, cy, radius, bounce, compareFunc) {
    const dx = movableObject.x - cx;
    const dy = movableObject.y - cy;
    const dist = Math.hypot(dx, dy);
    if (compareFunc(dist, radius)) {
        const angle = Math.atan2(movableObject.y - cy, movableObject.x - cx);
        movableObject.x = cx + radius * Math.cos(angle);
        movableObject.y = cy + radius * Math.sin(angle);

        const nx = dx / dist;
        const ny = dy / dist;
        const dotProduct = movableObject.vx * nx + movableObject.vy * ny;
        const factor = 1 + bounce;
        movableObject.vx -= factor * dotProduct * nx;
        movableObject.vy -= factor * dotProduct * ny;
    }
}

function handleCollisionWithCircleInside(movableObject, cx, cy, radius, bounce) {
    handleCollisionWithCircle(movableObject, cx, cy, radius, bounce, (d, r) => d > r);
}

function handleCollisionWithCircleOutside(movableObject, cx, cy, radius, bounce) {
    handleCollisionWithCircle(movableObject, cx, cy, radius, bounce, (d, r) => d < r);
}

function handleCollisionWithPosts(movableObject, objectRadius, bounce) {
    const posts = [ { x: 0, y: goalTop }, { x: 0, y: goalBottom }, { x: ARENA_WIDTH, y: goalTop }, { x: ARENA_WIDTH, y: goalBottom } ];
    for (let post of posts) {
        handleCollisionWithCircleOutside(movableObject, post.x, post.y, POST_RADIUS + objectRadius, bounce);
    }
}

export function updateGame(state) {
    const { players, inputs, ball, score, ballPossession } = state;
    handlePlayerMovement(players, inputs, ballPossession);
    handlePlayerKick(players, inputs, ball, ballPossession);
    handleBallMovement(ball);
    handleGoal(players, ball, score, ballPossession);
}

function handlePlayerMovement(players, inputs, ballPossession) {
    for (let id in players) {
        const p = players[id];
        const input = inputs[id];

        applyMovementPhysicsToPlayer(p, input);
        handlePlayerCollisionWithMargin(p);
        handleCollisionWithPosts(p, PLAYER_RADIUS, 0);
        handlePlayerCollisionWithKickoffProtection(p, ballPossession);
    }
}

function applyMovementPhysicsToPlayer(p, input) {
    if (input.up) p.vy -= PLAYER_ACCELERATION;
    if (input.down) p.vy += PLAYER_ACCELERATION;
    if (input.left) p.vx -= PLAYER_ACCELERATION;
    if (input.right) p.vx += PLAYER_ACCELERATION;

    p.vy *= PLAYER_FRICTION;
    p.vx *= PLAYER_FRICTION;

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER_MAX_SPEED) {
        const scale = PLAYER_MAX_SPEED / speed;
        p.vx *= scale;
        p.vy *= scale;
    }

    p.x += p.vx;
    p.y += p.vy;
}

function handlePlayerCollisionWithMargin(p) {
    handleCollisionOnX(p, -PLAYER_OUT_MARGIN, ARENA_WIDTH + PLAYER_OUT_MARGIN, 0);
    handleCollisionOnY(p, -PLAYER_OUT_MARGIN, ARENA_HEIGHT + PLAYER_OUT_MARGIN, 0);
}

function handlePlayerCollisionWithKickoffProtection(p, ballPossession) {
    if (ballPossession.until <= Date.now()) {
        return;
    }

    if (p.y > ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS || p.y < ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS) {
        if (p.team == 0) handleCollisionSingle(p, ARENA_WIDTH / 2 - PLAYER_RADIUS, 0, 'x', 'vx', (d, r) => d > r);
        else if (p.team == 1) handleCollisionSingle(p, ARENA_WIDTH / 2 + PLAYER_RADIUS, 0, 'x', 'vx', (d, r) => d < r);
    }

    const dist = Math.hypot(p.x - ARENA_WIDTH / 2, p.y - ARENA_HEIGHT / 2);
    if (ballPossession.team != p.team) {
        handleCollisionWithCircleOutside(p, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS, 0);
    }
    else if ((p.team == 0 && p.x > ARENA_WIDTH / 2) || (p.team == 1 && p.x < ARENA_WIDTH / 2)) {
        handleCollisionWithCircleInside(p, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, MIDDLE_CIRCLE_RADIUS - PLAYER_RADIUS, 0);
    }
    else {
        handleCollisionWithCircleOutside(p, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS, PLAYER_RADIUS, 0);
        handleCollisionWithCircleOutside(p, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS, PLAYER_RADIUS, 0);
    }
}

function handlePlayerKick(players, inputs, ball, ballPossession) {
    for (let id in players) {
        const player = players[id];
        const input = inputs[id];

        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distance = Math.hypot(dx, dy);

        const minDist = PLAYER_RADIUS + BALL_RADIUS;

        if (distance <= minDist && input.kick && Date.now() > player.lastKick + KICK_COOLDOWN_MILLIS) {
            ballPossession.until = 0;
            player.lastKick = Date.now();

            const aimX = input.mouseX - ball.x;
            const aimY = input.mouseY - ball.y;

            const aimLength = Math.hypot(aimX, aimY);
            if (aimLength === 0) continue;

            const nx = aimX / aimLength;
            const ny = aimY / aimLength;

            ball.vx = nx * KICK_SPEED;
            ball.vy = ny * KICK_SPEED;
        }
    }
}

function handleBallMovement(ball) {
    applyMovementPhysicsToBall(ball);
    handleBallCollisionWithFieldBorder(ball);
    handleCollisionWithPosts(ball, BALL_RADIUS, 1);
    handleBallCollisionWithNet(ball);
}

function applyMovementPhysicsToBall(ball) {
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;

    ball.x += ball.vx;
    ball.y += ball.vy;
}

function handleBallCollisionWithFieldBorder(ball) {
    handleCollisionOnY(ball, BALL_RADIUS, ARENA_HEIGHT - BALL_RADIUS, 1);
    if (ball.y < goalTop || ball.y > goalBottom) {
        handleCollisionOnX(ball, BALL_RADIUS, ARENA_WIDTH - BALL_RADIUS, 1);
    }
}

function handleBallCollisionWithNet(ball) {
    handleCollisionOnX(ball, BALL_RADIUS - GOAL_DEPTH, ARENA_WIDTH + GOAL_DEPTH - BALL_RADIUS, 0.5);
    if (ball.x < 0 || ball.x > ARENA_WIDTH) {
        handleCollisionOnY(ball, goalBottom - BALL_RADIUS, goalTop + BALL_RADIUS, 0.5);
    }
}

function handleGoal(players, ball, score, ballPossession) {
    if (ball.x < -BALL_RADIUS && ball.y > goalTop && ball.y < goalBottom) {
        score.right += 1;
        ballPossession.team = 0;
    }
    else if (ball.x > ARENA_WIDTH + BALL_RADIUS && ball.y > goalTop && ball.y < goalBottom) {
        score.left += 1;
        ballPossession.team = 1;
    }
    else {
        return;
    }

    restartRound(ball, players, ballPossession);
}

export function restartGame(state) {
    state.score.left = 0;
    state.score.right = 0;
    state.ballPossession.team = 0;

    restartRound(state.ball, state.players, state.ballPossession);
}

function restartRound(ball, players, ballPossession) {
    ball.x = ARENA_WIDTH / 2;
    ball.y = ARENA_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;

    const teamsPlayers = [ 0, 0 ];
    for (let playerIndex in players) {
        const p = players[playerIndex];

        p.x = teamsSpawns[p.team][teamsPlayers[p.team] % MAX_PLAYERS].x;
        p.y = teamsSpawns[p.team][teamsPlayers[p.team] % MAX_PLAYERS].y;
        p.vx = 0;
        p.vy = 0;

        teamsPlayers[p.team]++;
    }

    ballPossession.until = Date.now() + GOAL_CELEBRATION_SECONDS * 1000 + POSSESSION_SECONDS * 1000;
}
