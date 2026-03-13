import { CONSTANTS, MESSAGES_TYPES } from "../shared/constants.js";

const {
    TEAM_0_COLOR,
    TEAM_1_COLOR,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    GOAL_WIDTH,
    GOAL_DEPTH,
    MIDDLE_CIRCLE_RADIUS,
    POST_RADIUS,
    BALL_RADIUS,
    PLAYER_RADIUS
} = CONSTANTS;

const { STATE_MESSAGE, INPUT_MESSAGE, SET_NAME_MESSAGE, RESET_SCORE_MESSAGE, GOAL_MESSAGE, TEAMS_MESSAGE, REMOVE_PLAYER_MESSAGE } = MESSAGES_TYPES;

const config = {
    type: Phaser.AUTO,
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    backgroundColor: '#0b3d0b',
    scale: {
        mode: Phaser.Scale.RESIZE
    },
    scene: { create, update }
};

new Phaser.Game(config);

let socket;
let graphics;
let scoreText;
let playersLabels = {};

let players = {};
let ball = null;
let score = { left: 0, right: 0 };

let fieldOffset = { x: 0, y: 0 };

function create() {
    socket = new WebSocket(`ws://${location.host}`);

    const handlers = {
        [STATE_MESSAGE]: (d) => updateState(d),
        [REMOVE_PLAYER_MESSAGE]: (d) => removePlayer(d.id),
        [GOAL_MESSAGE]: (d) => showGoalAnimation(this, d.team),
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handlers[data.type]?.(data);
    };

    graphics = this.add.graphics();
    scoreText = this.add.text(0, 0, "0 - 0", { fontSize: "32px", color: "#ffffff" }).setOrigin(0.5, 0.5);

    setupInput(this);
}

function updateState(newState) {
    players = newState.players;
    ball = newState.ball;
    score = newState.score;
}

function removePlayer(id) {
    playersLabels[id].id.destroy();
    playersLabels[id].name.destroy();
    delete playersLabels[id];
}

function setupInput(scene) {
    const keys = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    let inputState = {
        up: false,
        down: false,
        left: false,
        right: false,
        mouseX: 0,
        mouseY: 0,
        kick: false
    };

    scene.input.on("pointermove", pointer => {
        inputState.mouseX = pointer.x - fieldOffset.x;
        inputState.mouseY = pointer.y - fieldOffset.y;
    });

    scene.input.on("pointerdown", () => {
        inputState.kick = true;
    });

    scene.input.on("pointerup", () => {
        inputState.kick = false;
    });

    scene.events.on("update", () => {
        inputState.up = keys.up.isDown;
        inputState.down = keys.down.isDown;
        inputState.left = keys.left.isDown;
        inputState.right = keys.right.isDown;

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: INPUT_MESSAGE,
                input: inputState
            }));
        }
    });
}

function update() {
    graphics.clear();
    this.cameras.main.setBackgroundColor('#0b3d0b');

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const fieldX = (screenWidth - ARENA_WIDTH) / 2;
    const fieldY = (screenHeight - ARENA_HEIGHT) / 2;
    fieldOffset.x = fieldX;
    fieldOffset.y = fieldY;

    scoreText.setPosition(fieldX + ARENA_WIDTH / 2, fieldY / 2);
    scoreText.setText(score.left + " - " + score.right);

    drawGrass(fieldX, fieldY);
    drawFieldBorder(fieldX, fieldY);

    const goalTop = fieldY + (ARENA_HEIGHT / 2) - (GOAL_WIDTH / 2);
    const goalBottom = fieldY + (ARENA_HEIGHT / 2) + (GOAL_WIDTH / 2);

    drawNet(fieldX, goalTop, goalBottom);
    drawPosts(fieldX, goalTop, goalBottom);
    drawMidfieldDivision(fieldX, fieldY);

    for (let id in players) {
        drawPlayer(this, fieldX, fieldY, players[id], id);
    }

    drawBall(fieldX, fieldY);
}

function drawGrass(fieldX, fieldY) {
    const stripeHeight = ARENA_HEIGHT / 10;

    for (let i = 0; i < 10; i++) {
        graphics.fillStyle(i % 2 === 0 ? 0x2e8b57 : 0x276f47);
        graphics.fillRect(fieldX, fieldY + i * stripeHeight, ARENA_WIDTH, stripeHeight);
    }
}

function drawFieldBorder(fieldX, fieldY) {
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeRect(fieldX, fieldY, ARENA_WIDTH, ARENA_HEIGHT);
}

function drawNet(fieldX, goalTop, goalBottom) {
    drawNetFrames(fieldX, goalTop);
    drawNetMesh(fieldX, goalTop, goalBottom);
}

function drawNetFrames(fieldX, goalTop) {
    graphics.lineStyle(3, 0xffffff);

    graphics.strokeRect(fieldX - GOAL_DEPTH, goalTop, GOAL_DEPTH, GOAL_WIDTH);
    graphics.strokeRect(fieldX + ARENA_WIDTH, goalTop, GOAL_DEPTH, GOAL_WIDTH);
}

function drawNetMesh(fieldX, goalTop, goalBottom) {
    graphics.lineStyle(1, 0xffffff, 0.25);

    for (let i = 0; i <= GOAL_WIDTH; i += 15) {
        graphics.lineBetween(fieldX - GOAL_DEPTH, goalTop + i, fieldX, goalTop + i);
        graphics.lineBetween(fieldX + ARENA_WIDTH, goalTop + i, fieldX + ARENA_WIDTH + GOAL_DEPTH, goalTop + i);
    }

    for (let i = 0; i <= GOAL_DEPTH; i += 10) {
        graphics.lineBetween(fieldX - i, goalTop, fieldX - i, goalBottom);
        graphics.lineBetween(fieldX + ARENA_WIDTH + i, goalTop, fieldX + ARENA_WIDTH + i, goalBottom);
    }
}

function drawPosts(fieldX, goalTop, goalBottom) {
    graphics.fillStyle(0xffffff);

    graphics.fillCircle(fieldX, goalTop, POST_RADIUS);
    graphics.fillCircle(fieldX, goalBottom, POST_RADIUS);

    graphics.fillCircle(fieldX + ARENA_WIDTH, goalTop, POST_RADIUS);
    graphics.fillCircle(fieldX + ARENA_WIDTH, goalBottom, POST_RADIUS);
}

function drawMidfieldDivision(fieldX, fieldY) {
    drawVerticalLines(fieldX, fieldY);
    drawMiddleCircle(fieldX, fieldY);
    drawBallSpawn(fieldX, fieldY);
}

function drawVerticalLines(fieldX, fieldY) {
    graphics.lineStyle(2, 0xffffff, 1);

    graphics.beginPath();
    graphics.moveTo(fieldX + ARENA_WIDTH / 2, fieldY);
    graphics.lineTo(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT);
    graphics.strokePath();    
}

function drawMiddleCircle(fieldX, fieldY) {
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT / 2, MIDDLE_CIRCLE_RADIUS);
}

function drawBallSpawn(fieldX, fieldY) {
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT / 2, BALL_RADIUS);
}

function drawPlayer(scene, fieldX, fieldY, p, id) {
    graphics.fillStyle(0x000000);
    graphics.fillCircle(fieldX + p.x, fieldY + p.y, PLAYER_RADIUS);
    graphics.fillStyle(p.team == 0 ? TEAM_0_COLOR : TEAM_1_COLOR);
    graphics.fillCircle(fieldX + p.x, fieldY + p.y, PLAYER_RADIUS * 9 / 10);

    if (!playersLabels[id]) {
        playersLabels[id] = { 
            id: scene.add.text(0, 0, p.id, { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5),
            name: scene.add.text(0, 0, p.name, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5, 0)
        };
    }
    else {
        playersLabels[id].id.setPosition(fieldX + p.x, fieldY + p.y);
        playersLabels[id].name.setPosition(fieldX + p.x, fieldY + p.y + PLAYER_RADIUS + 4);
        playersLabels[id].name.setText(p.name);
    }
}

function drawBall(fieldX, fieldY) {
    if (!ball) {
        return;
    }
    
    graphics.fillStyle(0x000000);
    graphics.fillCircle(fieldX + ball.x, fieldY + ball.y, BALL_RADIUS);
    graphics.fillStyle(0xEAFF00);
    graphics.fillCircle(fieldX + ball.x, fieldY + ball.y, BALL_RADIUS * 9 / 10);
}

function showGoalAnimation(scene, team) {
    const teamColor = team == 1 ? TEAM_0_COLOR : TEAM_1_COLOR;
    const color = "#" + teamColor.toString(16).padStart(6, "0");

    const goalText = scene.add.text(
        scene.cameras.main.width / 2,
        scene.cameras.main.height / 2,
        "GOAL!",
        {
            fontSize: "96px",
            color: color,
            fontStyle: "bold"
        }
    ).setOrigin(0.5);

    goalText.x = -300;

    scene.tweens.add({
        targets: goalText,
        x: scene.cameras.main.width / 2,
        duration: 500,
        ease: "Back.out"
    });

    scene.tweens.add({
        targets: goalText,
        alpha: 0,
        duration: 250,
        yoyo: true,
        repeat: 6
    });

    scene.time.delayedCall(2500, () => {
        goalText.destroy();
    });
}

// Commands

window.setName = function(name) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: SET_NAME_MESSAGE,
            name: name
        }));
    }
};

window.resetScore = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: RESET_SCORE_MESSAGE
        }));
    }
};

window.teams = function(teamZero, teamOne) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: TEAMS_MESSAGE,
            teams: [ teamZero, teamOne ]
        }));
    }
};
