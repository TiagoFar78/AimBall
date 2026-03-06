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

        if (p.x < -PLAYER_OUT_MARGIN) {
            p.x = -PLAYER_OUT_MARGIN;
            p.vx = 0;
        }
        else if (p.x > ARENA_WIDTH + PLAYER_OUT_MARGIN) {
            p.x = ARENA_WIDTH + PLAYER_OUT_MARGIN;
            p.vx = 0;
        }

        if (p.y < -PLAYER_OUT_MARGIN) {
            p.y = -PLAYER_OUT_MARGIN;
            p.vy = 0;
        }
        else if (p.y > ARENA_HEIGHT + PLAYER_OUT_MARGIN) {
            p.y = ARENA_HEIGHT + PLAYER_OUT_MARGIN;
            p.vy = 0;
        }

        const posts = [ { x: 0, y: goalTop }, { x: 0, y: goalBottom }, { x: ARENA_WIDTH, y: goalTop }, { x: ARENA_WIDTH, y: goalBottom } ];
        for (let post of posts) {
            const dx = p.x - post.x;
            const dy = p.y - post.y;

            const distance = Math.hypot(dx, dy);
            const collisionDist = PLAYER_RADIUS + POST_RADIUS;

            if (distance < collisionDist) {
                const nx = dx / distance;
                const ny = dy / distance;

                p.x = post.x + nx * collisionDist;
                p.y = post.y + ny * collisionDist;

                const dot = p.vx * nx + p.vy * ny;
                p.vx -= 2 * dot * nx;
                p.vy -= 2 * dot * ny;
            }
        }

        if (ballPossession.until > Date.now()) {
            if (p.y > ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS || p.y < ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS) {
                if (p.team == 0) {
                    if (p.x > ARENA_WIDTH / 2 - PLAYER_RADIUS) {
                        p.x = ARENA_WIDTH / 2 - PLAYER_RADIUS;
                        p.vx = 0;
                    }
                }
                else if (p.team == 1) {
                    if (p.x < ARENA_WIDTH / 2 + PLAYER_RADIUS) {
                        p.x = ARENA_WIDTH / 2 + PLAYER_RADIUS;
                        p.vx = 0;
                    }
                }
            }

            const dist = Math.hypot(p.x - ARENA_WIDTH / 2, p.y - ARENA_HEIGHT / 2);
            if (ballPossession.team != p.team) {
                if (dist < MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS) {
                    const angle = Math.atan2(p.y - ARENA_HEIGHT / 2, p.x - ARENA_WIDTH / 2);
                    p.x = ARENA_WIDTH / 2 + (MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS) * Math.cos(angle);
                    p.y = ARENA_HEIGHT / 2 + (MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS) * Math.sin(angle);
                }
            }
            else if ((p.team == 0 && p.x > ARENA_WIDTH / 2) || (p.team == 1 && p.x < ARENA_WIDTH / 2)) {
                if (dist > MIDDLE_CIRCLE_RADIUS - PLAYER_RADIUS) {
                    const angle = Math.atan2(p.y - ARENA_HEIGHT / 2, p.x - ARENA_WIDTH / 2);
                    p.x = ARENA_WIDTH / 2 + (MIDDLE_CIRCLE_RADIUS - PLAYER_RADIUS) * Math.cos(angle);
                    p.y = ARENA_HEIGHT / 2 + (MIDDLE_CIRCLE_RADIUS - PLAYER_RADIUS) * Math.sin(angle);
                }
            }
            else if (Math.hypot(p.x - ARENA_WIDTH / 2, p.y - (ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS)) < PLAYER_RADIUS) {
                const angle = Math.atan2(p.y - (ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS), p.x - ARENA_WIDTH / 2);
                p.x = ARENA_WIDTH / 2 + PLAYER_RADIUS * Math.cos(angle);
                p.y = ARENA_HEIGHT / 2 + MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS * Math.sin(angle);
            }
            else if (Math.hypot(p.x - ARENA_WIDTH / 2, p.y - (ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS)) < PLAYER_RADIUS) {
                const angle = Math.atan2(p.y - (ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS), p.x - ARENA_WIDTH / 2);
                p.x = ARENA_WIDTH / 2 + PLAYER_RADIUS * Math.cos(angle);
                p.y = ARENA_HEIGHT / 2 - MIDDLE_CIRCLE_RADIUS + PLAYER_RADIUS * Math.sin(angle);
            }
        }
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

        if (distance < minDist && input.kick) {
            ballPossession.until = 0;

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
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;

    ball.x += ball.vx;
    ball.y += ball.vy;

    // horizontal walls collision
    if (ball.y < BALL_RADIUS) {
        ball.y = BALL_RADIUS;
        ball.vy *= -1;
    }
    else if (ball.y > ARENA_HEIGHT - BALL_RADIUS) {
        ball.y = ARENA_HEIGHT - BALL_RADIUS;
        ball.vy *= -1;
    }

    // posts collision
    const posts = [ { x: 0, y: goalTop }, { x: 0, y: goalBottom }, { x: ARENA_WIDTH, y: goalTop }, { x: ARENA_WIDTH, y: goalBottom } ];
    for (let post of posts) {
        const dx = ball.x - post.x;
        const dy = ball.y - post.y;

        const distance = Math.hypot(dx, dy);
        const minDist = BALL_RADIUS + POST_RADIUS;

        if (distance < minDist) {
            const nx = dx / distance;
            const ny = dy / distance;

            ball.x = post.x + nx * minDist;
            ball.y = post.y + ny * minDist;

            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx;
            ball.vy -= 2 * dot * ny;
        }
    }

    // vertical walls collision
    if (ball.x < BALL_RADIUS) {
        if (ball.y < goalTop || ball.y > goalBottom) {
            ball.x = BALL_RADIUS;
            ball.vx *= -1;
        }
    }
    else if (ball.x > ARENA_WIDTH - BALL_RADIUS) {
        if (ball.y < goalTop || ball.y > goalBottom) {
            ball.x = ARENA_WIDTH - BALL_RADIUS;
            ball.vx *= -1;
        }
    }

    // net collision
    if (ball.x < BALL_RADIUS - GOAL_DEPTH) {
        ball.x = BALL_RADIUS;
        ball.vx *= -0.5;
    }
    else if (ball.x > ARENA_WIDTH + GOAL_DEPTH - BALL_RADIUS) {
        ball.x = ARENA_WIDTH + GOAL_DEPTH - BALL_RADIUS;
        ball.vx *= -0.5;
    }

    if (ball.x < 0 || ball.x > ARENA_WIDTH) {
        if (ball.y > goalBottom - BALL_RADIUS) {
            ball.y = goalBottom - BALL_RADIUS;
            ball.vy *= -0.5;
        }
        else if (ball.y < goalTop + BALL_RADIUS) {
            ball.y = goalTop + BALL_RADIUS;
            ball.vy *= -0.5;
        }
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
