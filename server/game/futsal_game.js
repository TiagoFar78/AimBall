import { CONSTANTS } from "../../shared/constants.js";

const { 
    ARENA_WIDTH,
    ARENA_HEIGHT,
    PLAYER_OUT_MARGIN,
    GOAL_WIDTH,
    GOAL_DEPTH,
    POST_RADIUS,
    BALL_RADIUS,
    KICK_SPEED,
    BALL_FRICTION,
    PLAYER_RADIUS,
    PLAYER_ACCELERATION,
    PLAYER_FRICTION,
    PLAYER_MAX_SPEED
} = CONSTANTS;


const goalTop = (ARENA_HEIGHT / 2) - (GOAL_WIDTH / 2);
const goalBottom = (ARENA_HEIGHT / 2) + (GOAL_WIDTH / 2);

export function updateGame(state) {
    const { players, inputs, ball, score } = state;
    handlePlayerMovement(players, inputs);
    handlePlayerKick(players, inputs, ball);
    handleBallMovement(ball);
    handleGoal(ball, score);
}

function handlePlayerMovement(players, inputs) {
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
    }
}

function handlePlayerKick(players, inputs, ball) {
    for (let id in players) {
        const player = players[id];
        const input = inputs[id];

        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distance = Math.hypot(dx, dy);

        const minDist = PLAYER_RADIUS + BALL_RADIUS;

        if (distance < minDist && input.kick) {

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

function handleGoal(ball, score) {
    if (ball.x < -BALL_RADIUS && ball.y > goalTop && ball.y < goalBottom) {
        score.right += 1;
        resetBall(ball);
    }
    else if (ball.x > ARENA_WIDTH + BALL_RADIUS && ball.y > goalTop && ball.y < goalBottom) {
        score.left += 1;
        resetBall(ball);
    }
}

function resetBall(ball) {
    ball.x = ARENA_WIDTH / 2;
    ball.y = ARENA_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
}