import { CONSTANTS } from "../shared/constants.js";

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

let socket;
let graphics;
let scoreText;

let playersLabels = {};
let players = {};
let ball = null;
let score = { left: 0, right: 0 };

let fieldOffset = { x: 0, y: 0 };

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

function create() {
    graphics = this.add.graphics();
    scoreText = this.add.text(0, 0, "0 - 0", {
        fontSize: "32px",
        color: "#ffffff"
    });

    socket = new WebSocket("ws://localhost:8081");

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "state") {
            players = data.players;
            ball = data.ball;
            score = data.score;
        }
        else if (data.type === "removePlayer") {
            const id = data.id;
            if (playersLabels[id]) {
                playersLabels[id].id.destroy();
                playersLabels[id].name.destroy();
                delete playersLabels[id];
            }
        }
    };

    setupInput(this);
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

    scoreText.setPosition(470, 40);
    scoreText.setText(score.left + " - " + score.right);

    // ---------------------
    // Grass (striped)
    // ---------------------

    const stripeHeight = ARENA_HEIGHT / 10;

    for (let i = 0; i < 10; i++) {
        graphics.fillStyle(i % 2 === 0 ? 0x2e8b57 : 0x276f47);
        graphics.fillRect(
            fieldX,
            fieldY + i * stripeHeight,
            ARENA_WIDTH,
            stripeHeight
        );
    }

    // Field border
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeRect(fieldX, fieldY, ARENA_WIDTH, ARENA_HEIGHT);

    const goalTop = fieldY + (ARENA_HEIGHT / 2) - (GOAL_WIDTH / 2);
    const goalBottom = fieldY + (ARENA_HEIGHT / 2) + (GOAL_WIDTH / 2);

    // ---------------------
    // Goal Frames
    // ---------------------

    graphics.lineStyle(3, 0xffffff);

    // Left
    graphics.strokeRect(
        fieldX - GOAL_DEPTH,
        goalTop,
        GOAL_DEPTH,
        GOAL_WIDTH
    );

    // Right
    graphics.strokeRect(
        fieldX + ARENA_WIDTH,
        goalTop,
        GOAL_DEPTH,
        GOAL_WIDTH
    );

    // ---------------------
    // Net Mesh
    // ---------------------

    graphics.lineStyle(1, 0xffffff, 0.25);

    for (let i = 0; i <= GOAL_WIDTH; i += 15) {

        // Left horizontal
        graphics.lineBetween(
            fieldX - GOAL_DEPTH,
            goalTop + i,
            fieldX,
            goalTop + i
        );

        // Right horizontal
        graphics.lineBetween(
            fieldX + ARENA_WIDTH,
            goalTop + i,
            fieldX + ARENA_WIDTH + GOAL_DEPTH,
            goalTop + i
        );
    }

    for (let i = 0; i <= GOAL_DEPTH; i += 10) {

        // Left vertical
        graphics.lineBetween(
            fieldX - i,
            goalTop,
            fieldX - i,
            goalBottom
        );

        // Right vertical
        graphics.lineBetween(
            fieldX + ARENA_WIDTH + i,
            goalTop,
            fieldX + ARENA_WIDTH + i,
            goalBottom
        );
    }

    // ---------------------
    // Posts (Circular)
    // ---------------------

    graphics.fillStyle(0xffffff);

    graphics.fillCircle(fieldX, goalTop, POST_RADIUS);
    graphics.fillCircle(fieldX, goalBottom, POST_RADIUS);

    graphics.fillCircle(fieldX + ARENA_WIDTH, goalTop, POST_RADIUS);
    graphics.fillCircle(fieldX + ARENA_WIDTH, goalBottom, POST_RADIUS);

    // Midfield line
    graphics.lineStyle(2, 0xffffff, 1);

    graphics.beginPath();
    graphics.moveTo(fieldX + ARENA_WIDTH / 2, fieldY);
    graphics.lineTo(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT);
    graphics.strokePath();

    // Center circle
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT / 2, MIDDLE_CIRCLE_RADIUS);

    graphics.fillStyle(0xffffff);
    graphics.fillCircle(fieldX + ARENA_WIDTH / 2, fieldY + ARENA_HEIGHT / 2, BALL_RADIUS);

    // ---------------------
    // Players
    // ---------------------

    for (let id in players) {
        const p = players[id];

        graphics.fillStyle(p.team == 0 ? TEAM_0_COLOR : TEAM_1_COLOR);
        graphics.fillCircle(
            fieldX + p.x,
            fieldY + p.y,
            PLAYER_RADIUS
        );

        if (!playersLabels[id]) {
            playersLabels[id] = { 
                id: this.add.text(0, 0, p.id, { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5),
                name: this.add.text(0, 0, p.name, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5, 0)
            };
        }
        else {
            playersLabels[id].id.setPosition(fieldX + p.x, fieldY + p.y);
            playersLabels[id].name.setPosition(fieldX + p.x, fieldY + p.y + PLAYER_RADIUS + 4);
            playersLabels[id].name.setText(p.name);
        }
    }

    // ---------------------
    // Ball
    // ---------------------

    if (ball) {
        graphics.fillStyle(0xEAFF00);
        graphics.fillCircle(
            fieldX + ball.x,
            fieldY + ball.y,
            BALL_RADIUS
        );
    }
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
                type: "input",
                input: inputState
            }));
        }
    });
}

window.setName = function(name) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "setName",
            name: name
        }));
    }
};

window.resetScore = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "resetScore"
        }));
    }
};

window.teams = function(teamZero, teamOne) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "teams",
            teams: [ teamZero, teamOne ]
        }));
    }
};
