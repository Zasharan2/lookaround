var c = document.getElementById("gameCanvas");
var ctx = c.getContext("2d");

var keys = [];

document.addEventListener("keydown", function (event) {
    keys[event.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "Tab"].indexOf(event.key) > -1) {
        event.preventDefault();
    }
});

document.addEventListener("keyup", function (event) {
    keys[event.key] = false;
});

var mouseX = 0;
var mouseY = 0;

c.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

window.addEventListener("mousemove", function(event) {
    mouseX = event.clientX - c.getBoundingClientRect().left;
    mouseY = event.clientY - c.getBoundingClientRect().top;
    if (!(mouseX > 0 && mouseY > 0 && mouseX < 512 && mouseY < 512)) {
        mouseDown = false;
        // mouseX = NaN;
        // mouseY = NaN;
    }
});

var mouseDown, mouseButton;

window.addEventListener("mousedown", function(event) {
    if (mouseX > 0 && mouseY > 0 && mouseX < 512 && mouseY < 512) {
        mouseDown = true;
        mouseButton = event.buttons;
    } else {
        mouseDown = false;
    }
});

window.addEventListener("mouseup", function(event) {
    mouseDown = false;
});

var soundButton = document.getElementById("soundButton");
var soundDeath = document.getElementById("soundDeath");
var soundGoal = document.getElementById("soundGoal");
var soundJump = document.getElementById("soundJump");

const GAMESCREENTYPE = {
    NULL_TO_TITLE: 0.1,
    TITLE: 1,
    TITLE_TO_GAME: 1.2,
    TITLE_TO_EDIT: 1.3,
    GAME: 2,
    GAME_TO_EDIT: 2.3,
    EDIT: 3,
    EDIT_TO_GAME: 3.2,
    EDIT_TO_ALTER_SETTINGS: 3.4,
    EDIT_TO_SHIFT_SETTINGS: 3.5,
    ALTER_SETTINGS: 4,
    ALTER_SETTINGS_TO_EDIT: 4.3,
    SHIFT_SETTINGS: 5,
    SHIFT_SETTINGS_TO_EDIT: 5.3
};

const over9000 = 99999 // ridiculously large number

var gameScreen = GAMESCREENTYPE.NULL_TO_TITLE;
var editMode = false;

var editTimer = over9000;
var editDelay = 30;

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    scale(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
}

const GAMEOBJECTTYPE = {
    BLOCK: 0,
    PLAYER: 1,
    GOAL: 2,
    LAVA: 3,
    GREENBLOCK: 4.0,
    GREENSWITCH: 4.1,
    BLUEBLOCK: 5.0,
    BLUESWITCH: 5.1,
    REDBLOCK: 6.0,
    REDSWITCH: 6.1,
    ALTER: 7.0
};

const gameObjectSize = 16;
const lightRadius = 40;

const debugMode = false;

var deathTrigger = false;
var goalTrigger = false;
var shiftTrigger = false;

class GameObject {
    constructor(x, y, type) {
        this.pos = new Vector2(x, y);
        this.type = type;
        switch(this.type) {
            case GAMEOBJECTTYPE.PLAYER: {
                this.vel = new Vector2(0, 0);
                this.accel = new Vector2(0, 0.1);
                this.onGround = false;
                break;
            }
            case GAMEOBJECTTYPE.GREENSWITCH: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.BLUESWITCH: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.REDSWITCH: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.GREENBLOCK: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.BLUEBLOCK: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.REDBLOCK: {
                this.toggled = false;
                break;
            }
            case GAMEOBJECTTYPE.ALTER: {
                this.shift = 0;
                break;
            }
            default: {
                break;
            }
        }
    }

    collide(point) {
        if (point.x >= this.pos.x && point.x <= this.pos.x + gameObjectSize && point.y >= this.pos.y && point.y <= this.pos.y + gameObjectSize) {
            return true;
        }
        return false;
    }

    update() {
        switch(this.type) {
            case GAMEOBJECTTYPE.BLOCK: {
                break;
            }
            case GAMEOBJECTTYPE.PLAYER: {
                var dist = Math.sqrt(Math.pow(mouseX - (this.pos.x + (gameObjectSize / 2)), 2) + Math.pow(mouseY - (this.pos.y + (gameObjectSize / 2)), 2));
                if (dist < lightRadius + 10) {
                    if (debugMode) {
                        if (mouseDown) {
                            this.pos.x = mouseX;
                            this.pos.y = mouseY;
                        }
                    }
                    // player controls

                    // horizontal
                    this.accel.x = 0;
                    if (keys["d"] || keys["ArrowRight"]) {
                        this.accel.x = 0.03;
                    }
                    if (keys["a"] || keys["ArrowLeft"]) {
                        this.accel.x = -0.03;
                    }
                    if (!(keys["a"] || keys["d"] || keys["ArrowLeft"] || keys["ArrowRight"])) {
                        this.vel.x *= 0.9;
                    }

                    // vertical
                    if (this.onGround && (keys["w"] || keys["ArrowUp"])) {
                        this.vel.y = -3;
                        this.onGround = false;
                        soundJump.play();
                    }

                    // motion caps
                    if (this.vel.x > 3) {
                        this.vel.x = 3;
                        this.accel.x = 0;
                    }
                    if (this.vel.x < -3) {
                        this.vel.x = -3;
                        this.accel.x = 0;
                    }
                    if (this.vel.y > 3.5) {
                        this.vel.y = 3.5;
                    }

                    // move
                    this.vel = this.vel.add(this.accel.scale(deltaTime));
                    this.pos = this.pos.add(this.vel.scale(deltaTime));

                    // collide
                    this.accel.y = 0.1;
                    this.onGround = false;
                    deathTrigger = false;
                    goalTrigger = false;
                    shiftTrigger = false;
                    for (var i = 0; i < gameObjectList.length; i++) {
                        // left side collision
                        if (gameObjectList[i].collide(new Vector2(this.pos.x, this.pos.y + (gameObjectSize / 2)))) {
                            switch (gameObjectList[i].type) {
                                case GAMEOBJECTTYPE.BLOCK: {
                                    this.pos.x = gameObjectList[i].pos.x + gameObjectSize;
                                    this.vel.x = 0;
                                    this.accel.x = 0;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GOAL: {
                                    goalTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.LAVA: {
                                    deathTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x + gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUEBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x + gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x + gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUESWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.ALTER: {
                                    worldShift = gameObjectList[i].shift;
                                    shiftTrigger = true;
                                    break;
                                }
                                default: {
                                    break;
                                }
                            }
                        }
                        // right side collision
                        if (gameObjectList[i].collide(new Vector2(this.pos.x + gameObjectSize, this.pos.y + (gameObjectSize / 2)))) {
                            switch (gameObjectList[i].type) {
                                case GAMEOBJECTTYPE.BLOCK: {
                                    this.pos.x = gameObjectList[i].pos.x - gameObjectSize;
                                    this.vel.x = 0;
                                    this.accel.x = 0;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GOAL: {
                                    goalTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.LAVA: {
                                    deathTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x - gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUEBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x - gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.x = gameObjectList[i].pos.x - gameObjectSize;
                                        this.vel.x = 0;
                                        this.accel.x = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUESWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.ALTER: {
                                    worldShift = gameObjectList[i].shift;
                                    shiftTrigger = true;
                                    break;
                                }
                                default: {
                                    break;
                                }
                            }
                        }
                        // bottom left/right floor collision points
                        if (gameObjectList[i].collide(new Vector2(this.pos.x + (gameObjectSize * 0.2), this.pos.y + gameObjectSize)) || gameObjectList[i].collide(new Vector2(this.pos.x + (gameObjectSize * 0.8), this.pos.y + gameObjectSize))) {
                            switch (gameObjectList[i].type) {
                                case GAMEOBJECTTYPE.BLOCK: {
                                    this.pos.y = gameObjectList[i].pos.y - gameObjectSize;
                                    this.vel.y = 0;
                                    this.accel.y = 0;
                                    this.onGround = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GOAL: {
                                    goalTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.LAVA: {
                                    deathTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y - gameObjectSize;
                                        this.vel.y = 0;
                                        this.accel.y = 0;
                                        this.onGround = true;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUEBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y - gameObjectSize;
                                        this.vel.y = 0;
                                        this.accel.y = 0;
                                        this.onGround = true;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y - gameObjectSize;
                                        this.vel.y = 0;
                                        this.accel.y = 0;
                                        this.onGround = true;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUESWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDSWITCH: {
                                    if (!gameObjectList[i].toggled) {
                                        soundButton.play();
                                    }
                                    for (var j = 0; j < gameObjectList.length; j++) {
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.REDSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.REDBLOCK) {
                                            gameObjectList[j].toggled = true;
                                        }
                                        if (gameObjectList[j].type == GAMEOBJECTTYPE.GREENSWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.GREENBLOCK || gameObjectList[j].type == GAMEOBJECTTYPE.BLUESWITCH || gameObjectList[j].type == GAMEOBJECTTYPE.BLUEBLOCK) {
                                            gameObjectList[j].toggled = false;
                                        }
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.ALTER: {
                                    worldShift = gameObjectList[i].shift;
                                    shiftTrigger = true;
                                    break;
                                }
                                default: {
                                    break;
                                }
                            }
                        }
                        // top left/right ceil collision points
                        if (gameObjectList[i].collide(new Vector2(this.pos.x + (gameObjectSize * 0.2), this.pos.y)) || gameObjectList[i].collide(new Vector2(this.pos.x + (gameObjectSize * 0.8), this.pos.y))) {
                            switch (gameObjectList[i].type) {
                                case GAMEOBJECTTYPE.BLOCK: {
                                    this.pos.y = gameObjectList[i].pos.y + gameObjectSize;
                                    this.vel.y = 0;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GOAL: {
                                    goalTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.LAVA: {
                                    deathTrigger = true;
                                    break;
                                }
                                case GAMEOBJECTTYPE.GREENBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y + gameObjectSize;
                                        this.vel.y = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.BLUEBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y + gameObjectSize;
                                        this.vel.y = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.REDBLOCK: {
                                    if (gameObjectList[i].toggled) {
                                        this.pos.y = gameObjectList[i].pos.y + gameObjectSize;
                                        this.vel.y = 0;
                                    }
                                    break;
                                }
                                case GAMEOBJECTTYPE.ALTER: {
                                    worldShift = gameObjectList[i].shift;
                                    shiftTrigger = true;
                                    break;
                                }
                                default: {
                                    break;
                                }
                            }
                        }
                    }

                    // check boundary
                    if (this.pos.x > 512) {
                        deathTrigger = true;
                    }
                    if (this.pos.x < -gameObjectSize) {
                        deathTrigger = true;
                    }
                    if (this.pos.y > 512) {
                        deathTrigger = true;
                    }
                    if (this.pos.y < -gameObjectSize) {
                        deathTrigger = true;
                    }

                    if (deathTrigger) {
                        if (editMode) {
                            gameScreen = GAMESCREENTYPE.GAME_TO_EDIT;
                        } else {
                            death();
                        }
                    }
                    if (goalTrigger) {
                        if (editMode) {
                            gameScreen = GAMESCREENTYPE.GAME_TO_EDIT;
                        } else {
                            advanceLevel();
                        }
                    }
                    if (shiftTrigger) {
                        readFromWorldList();
                    }
                }
                break;
            }
            case GAMEOBJECTTYPE.ALTER: {
                break;
            }
            default: {
                break;
            }
        }
    }

    render() {
        ctx.beginPath();

        switch(this.type) {
            case GAMEOBJECTTYPE.BLOCK: {
                ctx.fillStyle = "#444444ff";
                ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                break;
            }
            case GAMEOBJECTTYPE.PLAYER: {
                ctx.fillStyle = "#ff0000ff";
                ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                break;
            }
            case GAMEOBJECTTYPE.GOAL: {
                ctx.fillStyle = "#fce303ff";
                ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                break;
            }
            case GAMEOBJECTTYPE.LAVA: {
                ctx.fillStyle = "#ff8742ff";
                ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                break;
            }
            case GAMEOBJECTTYPE.GREENSWITCH: {
                if (this.toggled) {
                    ctx.fillStyle = "#00ff00ff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.75), gameObjectSize * 0.75, gameObjectSize * 0.125);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                } else {
                    ctx.fillStyle = "#00ff00ff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.125), gameObjectSize * 0.75, gameObjectSize * 0.75);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                }
                break;
            }
            case GAMEOBJECTTYPE.BLUESWITCH: {
                if (this.toggled) {
                    ctx.fillStyle = "#00ffffff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.75), gameObjectSize * 0.75, gameObjectSize * 0.125);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                } else {
                    ctx.fillStyle = "#00ffffff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.125), gameObjectSize * 0.75, gameObjectSize * 0.75);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                }
                break;
            }
            case GAMEOBJECTTYPE.REDSWITCH: {
                if (this.toggled) {
                    ctx.fillStyle = "#ff00ffff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.75), gameObjectSize * 0.75, gameObjectSize * 0.125);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                } else {
                    ctx.fillStyle = "#ff00ffff";
                    ctx.fillRect(this.pos.x + (gameObjectSize * 0.125), this.pos.y + (gameObjectSize * 0.125), gameObjectSize * 0.75, gameObjectSize * 0.75);
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y + (gameObjectSize * 0.875), gameObjectSize, (gameObjectSize * 0.125));
                }
                break;
            }
            case GAMEOBJECTTYPE.GREENBLOCK: {
                if (this.toggled) {
                    ctx.fillStyle = "#00ff00ff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                } else {
                    ctx.fillStyle = "#008800ff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                }
                break;
            }
            case GAMEOBJECTTYPE.BLUEBLOCK: {
                if (this.toggled) {
                    ctx.fillStyle = "#00ffffff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                } else {
                    ctx.fillStyle = "#008888ff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                }
                break;
            }
            case GAMEOBJECTTYPE.REDBLOCK: {
                if (this.toggled) {
                    ctx.fillStyle = "#ff00ffff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                } else {
                    ctx.fillStyle = "#880088ff";
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, gameObjectSize);
                }
                break;
            }
            case GAMEOBJECTTYPE.ALTER: {
                if (gameScreen == GAMESCREENTYPE.EDIT) {
                    ctx.fillStyle = "#000000ff";
                    ctx.fillRect(this.pos.x, this.pos.y, (0.125 * gameObjectSize), gameObjectSize);
                    ctx.fillRect(this.pos.x + (0.875 * gameObjectSize), this.pos.y, (0.125 * gameObjectSize), gameObjectSize);
                    ctx.fillRect(this.pos.x, this.pos.y, gameObjectSize, (0.125 * gameObjectSize));
                    ctx.fillRect(this.pos.x, this.pos.y + (0.875 * gameObjectSize), gameObjectSize, (0.125 * gameObjectSize));
                }
                break;
            }
            default: {
                break;
            }
        }
    }
}

var deathAnimTimer = over9000;
var goalAnimTimer = over9000;
function death() {
    deathAnimTimer = 0;
    soundDeath.play();
    loadLevel(gameLevel);
}

function advanceLevel() {
    gameLevel++;
    goalAnimTimer = 0;
    soundGoal.play();
    loadLevel(gameLevel);
}

var gameObjectList = [];
var eGameObjectList = [];

var worldList = [];
var eWorldList = [];

function addGameObject(x, y, type) {
    gameObjectList.push(new GameObject(x * gameObjectSize, (31 - y) * gameObjectSize, type));
}

function addLine(x1, y1, x2, y2, type) {
    if (x1 == x2) {
        if (y2 > y1) {
            for (var i = y1; i <= y2; i++) {
                gameObjectList.push(new GameObject(x1 * gameObjectSize, (31 - i) * gameObjectSize, type));
            }
        } else if (y1 > y2) {
            for (var i = y2; i <= y1; i++) {
                gameObjectList.push(new GameObject(x1 * gameObjectSize, (31 - i) * gameObjectSize, type));
            }
        }
    }
    if (y1 == y2) {
        if (x2 > x1) {
            for (var i = x1; i <= x2; i++) {
                gameObjectList.push(new GameObject(i * gameObjectSize, (31 - y1) * gameObjectSize, type));
            }
        } else if (x1 > x2) {
            for (var i = x2; i <= x1; i++) {
                gameObjectList.push(new GameObject(i * gameObjectSize, (31 - y1) * gameObjectSize, type));
            }
        }
    }
}

function addRect(x1, y1, x2, y2, type) {
    if (x2 > x1) {
        for (var i = x1; i <= x2; i++) {
            addLine(i, y1, i, y2, type);
        }
    } else if (x1 > x2) {
        for (var i = x2; i <= x1; i++) {
            addLine(i, y1, i, y2, type);
        }
    }
}

function loadLevel(level) {
    gameObjectList = [];

    switch(level) {
        // test
        case 0: {
            addLine(0, 0, 0, 2, GAMEOBJECTTYPE.BLOCK);
            addLine(1, 0, 11, 0, GAMEOBJECTTYPE.BLOCK);
            addLine(4, 3, 8, 3, GAMEOBJECTTYPE.BLOCK);
            addLine(12, 0, 12, 2, GAMEOBJECTTYPE.BLOCK);

            addLine(15, 1, 22, 1, GAMEOBJECTTYPE.GREENBLOCK);
            addLine(19, 3, 24, 3, GAMEOBJECTTYPE.BLUEBLOCK);
            addLine(24, 3, 24, 5, GAMEOBJECTTYPE.BLUEBLOCK);
            addLine(25, 5, 31, 5, GAMEOBJECTTYPE.BLUEBLOCK);
            addLine(28, 7, 31, 7, GAMEOBJECTTYPE.GREENBLOCK);

            addGameObject(31, 9, GAMEOBJECTTYPE.GOAL);
            
            addGameObject(5, 4, GAMEOBJECTTYPE.GREENSWITCH);
            addGameObject(7, 4, GAMEOBJECTTYPE.BLUESWITCH);

            // players
            addGameObject(0, 4, GAMEOBJECTTYPE.PLAYER);
            addGameObject(12, 4, GAMEOBJECTTYPE.PLAYER);
            break;
        }
        case 1: {
            readCode("WyxbMCw0ODAsMF0sWzAsNDY0LDBdLFswLDQ0OCwwXSxbMCw0MzIsMF0sWzAsNDE2LDBdLFswLDQwMCwwXSxbMCwzODQsMF0sWzAsMzY4LDBdLFswLDM1MiwwXSxbMCwzMzYsMF0sWzAsMzIwLDBdLFswLDMwNCwwXSxbMCwyODgsMF0sWzAsMjcyLDBdLFswLDI1NiwwXSxbMCwyNDAsMF0sWzAsMjI0LDBdLFswLDIwOCwwXSxbMCwxOTIsMF0sWzAsMTc2LDBdLFswLDE2MCwwXSxbMCwxNDQsMF0sWzAsMTI4LDBdLFswLDExMiwwXSxbMCw5NiwwXSxbMCw4MCwwXSxbMCw2NCwwXSxbMCw0OCwwXSxbMCwzMiwwXSxbMCwxNiwwXSxbMCwwLDBdLFsxNiwwLDBdLFszMiwwLDBdLFs0OCwwLDBdLFs2NCwwLDBdLFs4MCwwLDBdLFs5NiwwLDBdLFsxMTIsMCwwXSxbMTI4LDAsMF0sWzE0NCwwLDBdLFsxNjAsMCwwXSxbMTc2LDAsMF0sWzE5MiwwLDBdLFsyMDgsMCwwXSxbMjI0LDAsMF0sWzI0MCwwLDBdLFsyNTYsMCwwXSxbMjcyLDAsMF0sWzI4OCwwLDBdLFszMDQsMCwwXSxbMzIwLDAsMF0sWzMzNiwwLDBdLFszNTIsMCwwXSxbMzY4LDAsMF0sWzM4NCwwLDBdLFs0MDAsMCwwXSxbNDE2LDAsMF0sWzQzMiwwLDBdLFs0NDgsMCwwXSxbNDY0LDAsMF0sWzQ4MCwwLDBdLFs0OTYsMCwwXSxbNDk2LDQzMiwwXSxbNDk2LDQxNiwwXSxbNDk2LDQwMCwwXSxbNDk2LDM4NCwwXSxbNDk2LDM2OCwwXSxbNDk2LDM1MiwwXSxbNDk2LDMzNiwwXSxbNDk2LDMyMCwwXSxbNDk2LDMwNCwwXSxbNDk2LDI4OCwwXSxbNDk2LDI3MiwwXSxbNDk2LDI1NiwwXSxbNDk2LDI0MCwwXSxbNDk2LDIyNCwwXSxbNDk2LDIwOCwwXSxbNDk2LDE5MiwwXSxbNDk2LDE3NiwwXSxbNDk2LDE2MCwwXSxbNDk2LDE0NCwwXSxbNDk2LDEyOCwwXSxbNDk2LDExMiwwXSxbNDk2LDk2LDBdLFs0OTYsODAsMF0sWzQ5Niw2NCwwXSxbNDk2LDQ4LDBdLFs0OTYsMzIsMF0sWzQ5NiwxNiwwXSxbNDk2LDAsMF0sWzAsNDk2LDBdLFsxNiw0OTYsMF0sWzMyLDQ5NiwwXSxbNDgsNDk2LDBdLFs2NCw0OTYsMF0sWzgwLDQ5NiwwXSxbOTYsNDk2LDBdLFsxMTIsNDk2LDBdLFsxMjgsNDk2LDBdLFsxNDQsNDk2LDBdLFsxNjAsNDk2LDBdLFsxNjAsNDk2LDNdLFsxNzYsNDk2LDNdLFsxOTIsNDk2LDNdLFsyMDgsNDk2LDBdLFsyMjQsNDk2LDBdLFsyNDAsNDk2LDBdLFsyNTYsNDk2LDBdLFsyNzIsNDk2LDBdLFsyODgsNDk2LDBdLFsyODgsNDgwLDBdLFsyODgsNDY0LDBdLFsyODgsNDQ4LDBdLFszMDQsNDQ4LDBdLFszMjAsNDQ4LDBdLFszMzYsNDQ4LDBdLFszNTIsNDQ4LDNdLFszNjgsNDQ4LDNdLFszODQsNDQ4LDNdLFs0MDAsNDQ4LDNdLFs0MTYsNDQ4LDNdLFs0MzIsNDQ4LDBdLFs0NDgsNDQ4LDBdLFs0NjQsNDQ4LDBdLFs0ODAsNDQ4LDBdLFs0OTYsNDQ4LDBdLFs0NjQsMzg0LDJdLFszMiw0ODAsMV0sXQ==");
            break;
        }
        case 2: {
            readCode("WyxbMCw0ODAsMF0sWzAsNDY0LDBdLFswLDQ0OCwwXSxbMCw0MzIsMF0sWzAsNDE2LDBdLFswLDQwMCwwXSxbMCwzODQsMF0sWzAsMzY4LDBdLFswLDM1MiwwXSxbMCwzMzYsMF0sWzAsMzIwLDBdLFswLDMwNCwwXSxbMCwyODgsMF0sWzAsMjcyLDBdLFswLDI1NiwwXSxbMCwyNDAsMF0sWzAsMjI0LDBdLFswLDIwOCwwXSxbMCwxOTIsMF0sWzAsMTc2LDBdLFswLDE2MCwwXSxbMCwxNDQsMF0sWzAsMTI4LDBdLFswLDExMiwwXSxbMCw5NiwwXSxbMCw4MCwwXSxbMCw2NCwwXSxbMCw0OCwwXSxbMCwzMiwwXSxbMCwxNiwwXSxbMCwwLDBdLFsxNiwwLDBdLFszMiwwLDBdLFs0OCwwLDBdLFs2NCwwLDBdLFs4MCwwLDBdLFs5NiwwLDBdLFsxMTIsMCwwXSxbMTI4LDAsMF0sWzE0NCwwLDBdLFsxNjAsMCwwXSxbMTc2LDAsMF0sWzE5MiwwLDBdLFsyMDgsMCwwXSxbMjI0LDAsMF0sWzI0MCwwLDBdLFsyNTYsMCwwXSxbMjcyLDAsMF0sWzI4OCwwLDBdLFszMDQsMCwwXSxbMzIwLDAsMF0sWzMzNiwwLDBdLFszNTIsMCwwXSxbMzY4LDAsMF0sWzM4NCwwLDBdLFs0MDAsMCwwXSxbNDE2LDAsMF0sWzQzMiwwLDBdLFs0NDgsMCwwXSxbNDY0LDAsMF0sWzQ4MCwwLDBdLFs0OTYsNDgwLDNdLFs0OTYsNDY0LDNdLFs0OTYsNDQ4LDBdLFs0OTYsNDMyLDBdLFs0OTYsNDE2LDBdLFs0OTYsNDAwLDBdLFs0OTYsMzg0LDBdLFs0OTYsMzY4LDBdLFs0OTYsMzUyLDBdLFs0OTYsMzM2LDBdLFs0OTYsMzIwLDBdLFs0OTYsMzA0LDBdLFs0OTYsMjg4LDBdLFs0OTYsMjcyLDBdLFs0OTYsMjU2LDBdLFs0OTYsMjQwLDBdLFs0OTYsMjI0LDBdLFs0OTYsMjA4LDBdLFs0OTYsMTkyLDBdLFs0OTYsMTc2LDBdLFs0OTYsMTYwLDBdLFs0OTYsMTQ0LDBdLFs0OTYsMTI4LDBdLFs0OTYsMTEyLDBdLFs0OTYsOTYsMF0sWzQ5Niw4MCwwXSxbNDk2LDY0LDBdLFs0OTYsNDgsMF0sWzQ5NiwzMiwwXSxbNDk2LDE2LDBdLFs0OTYsMCwwXSxbMCw0OTYsMF0sWzE2LDQ5NiwwXSxbMzIsNDk2LDBdLFs0OCw0OTYsMF0sWzY0LDQ5NiwwXSxbODAsNDk2LDBdLFs4MCw0OTYsM10sWzk2LDQ5NiwzXSxbMTEyLDQ5NiwzXSxbMTI4LDQ5NiwzXSxbMTQ0LDQ5NiwzXSxbMTYwLDQ5NiwwXSxbMTYwLDQ4MCwwXSxbMTYwLDQ2NCwwXSxbMTc2LDQ2NCwwXSxbMTkyLDQ2NCwwXSxbMjA4LDQ2NCwwXSxbMjI0LDQ2NCwwXSxbMjQwLDQ2NCwwXSxbMjU2LDQ2NCwzXSxbMjcyLDQ2NCwzXSxbMjg4LDQ2NCwzXSxbMzA0LDQ5NiwwXSxbMzA0LDQ4MCwwXSxbMzA0LDQ2NCwwXSxbMzIwLDQ5NiwwXSxbMzM2LDQ5NiwwXSxbMzUyLDQ5NiwwXSxbMzY4LDQ5NiwwXSxbMzg0LDQ5NiwwXSxbNDAwLDQ5NiwwXSxbNDE2LDQ5NiwwXSxbNDMyLDQ5NiwwXSxbNDQ4LDQ5NiwwXSxbNDY0LDQ5NiwwXSxbNDgwLDQ5NiwwXSxbNDk2LDQ5NiwwXSxbNDE2LDQ0OCwwXSxbNDE2LDQzMiwwXSxbNDE2LDQxNiwwXSxbNDE2LDQwMCwwXSxbNDE2LDM4NCwwXSxbNDE2LDM2OCwwXSxbNDE2LDM1MiwwXSxbNDE2LDMzNiwwXSxbNDE2LDMyMCwwXSxbNDE2LDMwNCwwXSxbNDE2LDI4OCwwXSxbNDE2LDI3MiwwXSxbNDE2LDI1NiwwXSxbNDE2LDI0MCwwXSxbNDE2LDIyNCwwXSxbNDE2LDIwOCwwXSxbNDE2LDE5MiwwXSxbNDE2LDE3NiwwXSxbNDE2LDE2MCwwXSxbNDE2LDE0NCwwXSxbNDE2LDEyOCwwXSxbNDY0LDQ0OCwwXSxbNDgwLDQ0OCwwXSxbNDMyLDQwMCwwXSxbNDQ4LDQwMCwwXSxbNDY0LDM1MiwwXSxbNDgwLDM1MiwwXSxbNDMyLDMwNCwwXSxbNDQ4LDMwNCwwXSxbNDY0LDI1NiwwXSxbNDgwLDI1NiwwXSxbNDMyLDIwOCwwXSxbNDQ4LDIwOCwwXSxbNDY0LDE2MCwwXSxbNDgwLDE2MCwwXSxbMzUyLDExMiwwXSxbMzY4LDExMiwwXSxbMzg0LDExMiwwXSxbNDAwLDExMiwwXSxbNDE2LDExMiwwXSxbNDMyLDExMiwwXSxbNDQ4LDExMiwwXSxbMjg4LDExMiwzXSxbMzA0LDExMiwzXSxbMzIwLDExMiwzXSxbMzM2LDExMiwzXSxbMTI4LDExMiwwXSxbMTQ0LDExMiwwXSxbMTYwLDExMiwwXSxbMTc2LDExMiwwXSxbMTkyLDExMiwwXSxbMjA4LDExMiwwXSxbMjI0LDExMiwwXSxbMjQwLDExMiwwXSxbMjU2LDExMiwwXSxbMjcyLDExMiwwXSxbNjQsMTEyLDNdLFs4MCwxMTIsM10sWzk2LDExMiwzXSxbMTEyLDExMiwzXSxbMTYsMjA4LDBdLFszMiwyMDgsMF0sWzQ4LDIwOCwwXSxbNjQsMjA4LDBdLFs4MCwyMDgsMF0sWzk2LDIwOCwwXSxbMTEyLDIwOCwwXSxbMTI4LDIwOCwwXSxbMTQ0LDIwOCwwXSxbMTkyLDIwOCwzXSxbMjA4LDIwOCwzXSxbMjI0LDIwOCwzXSxbMjQwLDIwOCwwXSxbMjQwLDE5MiwwXSxbMjQwLDE3NiwwXSxbMjU2LDIwOCwwXSxbMjU2LDE5MiwwXSxbMjU2LDE3NiwwXSxbMjcyLDIwOCwwXSxbMjcyLDE5MiwwXSxbMjcyLDE3NiwwXSxbMjg4LDIwOCwwXSxbMjg4LDE5MiwwXSxbMjg4LDE3NiwwXSxbMzA0LDIwOCwwXSxbMzA0LDE5MiwwXSxbMzA0LDE3NiwwXSxbMzIwLDIwOCwwXSxbMzIwLDE5MiwwXSxbMzIwLDE3NiwwXSxbMzM2LDIwOCwwXSxbMzM2LDE5MiwwXSxbMzM2LDE3NiwwXSxbMTYwLDMwNCwwXSxbMTc2LDMwNCwwXSxbMTkyLDMwNCwwXSxbMjA4LDMwNCwwXSxbMjI0LDMwNCwwXSxbMjQwLDMwNCwwXSxbMjU2LDMwNCwwXSxbMjcyLDMwNCwwXSxbMjg4LDMwNCwwXSxbMzA0LDMwNCwwXSxbMzIwLDMwNCwwXSxbMzM2LDMwNCwwXSxbMzUyLDMwNCwwXSxbMzY4LDMwNCwwXSxbMzg0LDMwNCwwXSxbNDAwLDMwNCwwXSxbMzA0LDI4OCwzXSxbMzA0LDI3MiwzXSxbMTQ0LDMwNCwzXSxbMTQ0LDI4OCwzXSxbMTQ0LDI3MiwzXSxbMzg0LDM1MiwyXSxbMTYsNDAwLDBdLFszMiw0MDAsMF0sWzQ4LDQwMCwwXSxbNjQsNDAwLDBdLFs4MCw0MDAsMF0sWzk2LDQwMCwwXSxbMTEyLDQwMCwwXSxbMTI4LDQwMCwwXSxbMTQ0LDQwMCwwXSxbMTYwLDQwMCwwXSxbMTc2LDQwMCwwXSxbMTkyLDQwMCwwXSxbMjA4LDQwMCwwXSxbMjI0LDQwMCwwXSxbMjQwLDQwMCwwXSxbMjU2LDQwMCwwXSxbMjcyLDQwMCwwXSxbMjg4LDQwMCwwXSxbMzA0LDQwMCwwXSxbMzIwLDQwMCwwXSxbMzM2LDQwMCwwXSxbMzUyLDQwMCwwXSxbMTYwLDE3NiwwXSxbMTYwLDE5MiwwXSxbMTYwLDIwOCwwXSxbMTc2LDIwOCwzXSxbMTQ0LDE3NiwwXSxbMTQ0LDE5MiwwXSxbMTI4LDE3NiwwXSxbMTI4LDE5MiwwXSxbMTEyLDE3NiwwXSxbOTYsMTc2LDBdLFs4MCwxNzYsMF0sWzY0LDE3NiwwXSxbNDgsMTc2LDBdLFszMiwxNzYsMF0sWzE2LDE3NiwwXSxbMTYsMTkyLDBdLFszMiwxOTIsMF0sWzQ4LDE5MiwwXSxbNjQsMTkyLDBdLFs4MCwxOTIsMF0sWzk2LDE5MiwwXSxbMTEyLDE5MiwwXSxbMzY4LDQwMCwzXSxbMzg0LDQwMCwzXSxbNDAwLDQwMCwzXSxbMzIsNDgwLDFdLF0=");
            break;
        }
        case 3: {
            readCode("WyxbMCw0ODAsMF0sWzAsNDY0LDBdLFswLDQ0OCwwXSxbMCw0MzIsMF0sWzAsNDE2LDBdLFswLDQwMCwwXSxbMCwzODQsMF0sWzAsMzY4LDBdLFswLDM1MiwwXSxbMCwzMzYsMF0sWzAsMzIwLDBdLFswLDMwNCwwXSxbMCwyODgsMF0sWzAsMjcyLDBdLFswLDI1NiwwXSxbMCwyNDAsMF0sWzAsMjI0LDBdLFswLDIwOCwwXSxbMCwxOTIsMF0sWzAsMTc2LDBdLFswLDE2MCwwXSxbMCwxNDQsMF0sWzAsMTI4LDBdLFswLDExMiwwXSxbMCw5NiwwXSxbMCw4MCwwXSxbMCw2NCwwXSxbMCw0OCwwXSxbMCwzMiwwXSxbMCwxNiwwXSxbMCwwLDBdLFsxNiwwLDBdLFszMiwwLDBdLFs0OCwwLDBdLFs2NCwwLDBdLFs4MCwwLDBdLFs5NiwwLDBdLFsxMTIsMCwwXSxbMTI4LDAsMF0sWzE0NCwwLDBdLFsxNjAsMCwwXSxbMTc2LDAsMF0sWzE5MiwwLDBdLFsyMDgsMCwwXSxbMjI0LDAsMF0sWzI0MCwwLDBdLFsyNTYsMCwwXSxbMjcyLDAsMF0sWzI4OCwwLDBdLFszMDQsMCwwXSxbMzIwLDAsMF0sWzMzNiwwLDBdLFszNTIsMCwwXSxbMzY4LDAsMF0sWzM4NCwwLDBdLFs0MDAsMCwwXSxbNDE2LDAsMF0sWzQzMiwwLDBdLFs0NDgsMCwwXSxbNDY0LDAsMF0sWzQ4MCwwLDBdLFs0OTYsNDgwLDBdLFs0OTYsNDY0LDBdLFs0OTYsNDQ4LDBdLFs0OTYsNDMyLDBdLFs0OTYsNDE2LDBdLFs0OTYsNDAwLDBdLFs0OTYsMzg0LDBdLFs0OTYsMzY4LDBdLFs0OTYsMzUyLDBdLFs0OTYsMzM2LDBdLFs0OTYsMzIwLDBdLFs0OTYsMzA0LDBdLFs0OTYsMjg4LDBdLFs0OTYsMjcyLDBdLFs0OTYsMjU2LDBdLFs0OTYsMjQwLDBdLFs0OTYsMjI0LDBdLFs0OTYsMjA4LDBdLFs0OTYsMTkyLDBdLFs0OTYsMTc2LDBdLFs0OTYsMTYwLDBdLFs0OTYsMTQ0LDBdLFs0OTYsMTI4LDBdLFs0OTYsMTEyLDBdLFs0OTYsOTYsMF0sWzQ5Niw4MCwwXSxbNDk2LDY0LDBdLFs0OTYsNDgsMF0sWzQ5NiwzMiwwXSxbNDk2LDE2LDBdLFs0OTYsMCwwXSxbMCw0OTYsMF0sWzE2LDQ5NiwwXSxbMzIsNDk2LDBdLFs0OCw0OTYsMF0sWzY0LDQ5NiwwXSxbODAsNDk2LDBdLFs5Niw0OTYsMF0sWzExMiw0OTYsMF0sWzEyOCw0OTYsMF0sWzE0NCw0OTYsMF0sWzE2MCw0OTYsMF0sWzY0LDQ4MCw0XSxbNjQsNDY0LDRdLFs2NCw0NDgsNF0sWzY0LDQzMiw0XSxbNjQsNDE2LDRdLFs4MCw0MTYsNF0sWzk2LDQxNiw0XSxbMTEyLDQxNiw0XSxbMTI4LDQxNiw0XSxbMTQ0LDQxNiw0XSxbMTYwLDQ4MCw0XSxbMTYwLDQ2NCw0XSxbMTYwLDQ0OCw0XSxbMTYwLDQzMiw0XSxbMTYwLDQxNiw0XSxbMTEyLDQ4MCw0LjFdLFsxNzYsNDk2LDVdLFsxOTIsNDk2LDVdLFsyMDgsNDk2LDVdLFsyMjQsNDk2LDVdLFsyNDAsNDk2LDVdLFsyNTYsNDk2LDVdLFsyNzIsNDk2LDVdLFsyODgsNDk2LDVdLFszMDQsNDk2LDVdLFszMjAsNDk2LDVdLFszMzYsNDk2LDVdLFszNTIsNDk2LDVdLFszNjgsNDk2LDVdLFszODQsNDk2LDVdLFs0MDAsNDk2LDBdLFs0MTYsNDk2LDBdLFs0MzIsNDk2LDBdLFs0NDgsNDk2LDBdLFs0NjQsNDk2LDBdLFs0ODAsNDk2LDBdLFs0OTYsNDk2LDBdLFszNTIsNDgwLDQuMV0sWzQ0OCw0NDgsMl0sWzE2LDk2LDBdLFszMiw5NiwwXSxbNDgsOTYsMF0sWzY0LDk2LDBdLFs4MCw5NiwwXSxbOTYsOTYsMF0sWzExMiw5NiwwXSxbMTI4LDk2LDBdLFsxNDQsOTYsMF0sWzE2MCw5NiwwXSxbMTc2LDk2LDNdLFsxOTIsOTYsM10sWzIwOCw5NiwzXSxbMjI0LDk2LDNdLFsyNDAsOTYsM10sWzI1Niw5NiwwXSxbMjU2LDgwLDBdLFsyNTYsNjQsMF0sWzI3Miw2NCwwXSxbMjg4LDY0LDBdLFszMDQsNjQsMF0sWzMyMCw2NCwwXSxbMzM2LDY0LDNdLFszNTIsNjQsM10sWzM2OCw2NCwzXSxbMzg0LDY0LDBdLFs0MDAsNjQsMF0sWzQxNiw2NCwwXSxbNDMyLDY0LDBdLFs0NDgsNjQsM10sWzMwNCwxNDQsMF0sWzMyMCwxNDQsMF0sWzMzNiwxNDQsMF0sWzM1MiwxNDQsMF0sWzM2OCwxNDQsMF0sWzM4NCwxNDQsMF0sWzQwMCwxNDQsMF0sWzQxNiwxNDQsMF0sWzQzMiwxNDQsMF0sWzQ0OCwxNDQsMF0sWzQ2NCwxNDQsMF0sWzQ4MCwxNDQsMF0sWzE2MCwxNDQsNF0sWzE3NiwxNDQsNF0sWzE5MiwxNDQsNF0sWzIwOCwxNDQsNF0sWzIyNCwxNDQsNF0sWzI0MCwxNDQsNF0sWzI1NiwxNDQsNF0sWzI3MiwxNDQsNF0sWzI4OCwxNDQsNF0sWzE2MCwxNjAsM10sWzE3NiwxNjAsM10sWzE5MiwxNjAsM10sWzIwOCwxNjAsM10sWzIyNCwxNjAsM10sWzI0MCwxNjAsM10sWzI1NiwxNjAsM10sWzI3MiwxNjAsM10sWzI4OCwxNjAsM10sWzE0NCwxNzYsMF0sWzE2MCwxNzYsMF0sWzE3NiwxNzYsMF0sWzE5MiwxNzYsMF0sWzIwOCwxNzYsMF0sWzIyNCwxNzYsMF0sWzI0MCwxNzYsMF0sWzI1NiwxNzYsMF0sWzI3MiwxNzYsMF0sWzI4OCwxNzYsMF0sWzMwNCwxNzYsMF0sWzE0NCwxNjAsMF0sWzMwNCwxNjAsMF0sWzY0LDE0NCwwXSxbODAsMTQ0LDBdLFs5NiwxNDQsMF0sWzExMiwxNDQsMF0sWzEyOCwxNDQsMF0sWzE0NCwxNDQsMF0sWzE2LDIyNCwwXSxbMzIsMjI0LDBdLFs0OCwyMjQsMF0sWzY0LDIyNCwwXSxbODAsMjI0LDBdLFs5NiwyMjQsMF0sWzExMiwyMjQsMF0sWzEyOCwyMjQsMF0sWzE0NCwyMjQsMF0sWzE0NCwyMjQsMF0sWzE0NCwyMDgsMF0sWzE0NCwxOTIsMF0sWzE0NCwxNzYsMF0sWzY0LDIwOCw1XSxbNjQsMTkyLDVdLFs2NCwxNzYsNV0sWzY0LDE2MCw1XSxbMTEyLDIwOCw1LjFdLFszMiw4MCwxXSxbMzIsNDgwLDFdLF0=");
            break;
        }
        case 4: {
            readCode("WyxbMCw0OTYsMF0sWzAsNDgwLDBdLFswLDQ2NCwwXSxbMCw0NDgsMF0sWzAsNDMyLDBdLFswLDQxNiwwXSxbMCw0MDAsMF0sWzAsMzg0LDBdLFswLDM2OCwwXSxbMCwzNTIsMF0sWzAsMzM2LDBdLFswLDMyMCwwXSxbMCwzMDQsMF0sWzAsMjg4LDBdLFswLDI3MiwwXSxbMCwyNTYsMF0sWzAsMjQwLDBdLFswLDIyNCwwXSxbMCwyMDgsMF0sWzAsMTkyLDBdLFswLDE3NiwwXSxbMCwxNjAsMF0sWzAsMTQ0LDBdLFswLDEyOCwwXSxbMCwxMTIsMF0sWzAsOTYsMF0sWzAsODAsMF0sWzAsNjQsMF0sWzAsNDgsMF0sWzAsMzIsMF0sWzAsMTYsMF0sWzAsMCwwXSxbNDk2LDQ5NiwwXSxbNDk2LDQ4MCwwXSxbNDk2LDQ2NCwwXSxbNDk2LDQ0OCwwXSxbNDk2LDQzMiwwXSxbNDk2LDQxNiwwXSxbNDk2LDQwMCwwXSxbNDk2LDM4NCwwXSxbNDk2LDM2OCwwXSxbNDk2LDM1MiwwXSxbNDk2LDMzNiwwXSxbNDk2LDMyMCwwXSxbNDk2LDMwNCwwXSxbNDk2LDI4OCwwXSxbNDk2LDI3MiwwXSxbNDk2LDI1NiwwXSxbNDk2LDI0MCwwXSxbNDk2LDIyNCwwXSxbNDk2LDIwOCwwXSxbNDk2LDE5MiwwXSxbNDk2LDE3NiwwXSxbNDk2LDE2MCwwXSxbNDk2LDE0NCwwXSxbNDk2LDEyOCwwXSxbNDk2LDExMiwwXSxbNDk2LDk2LDBdLFs0OTYsODAsMF0sWzQ5Niw2NCwwXSxbNDk2LDQ4LDBdLFs0OTYsMzIsMF0sWzQ5NiwxNiwwXSxbNDk2LDAsMF0sWzE2LDAsMF0sWzMyLDAsMF0sWzQ4LDAsMF0sWzY0LDAsMF0sWzgwLDAsMF0sWzk2LDAsMF0sWzExMiwwLDBdLFsxMjgsMCwwXSxbMTQ0LDAsMF0sWzE2MCwwLDBdLFsxNzYsMCwwXSxbMTkyLDAsMF0sWzIwOCwwLDBdLFsyMjQsMCwwXSxbMjQwLDAsMF0sWzI1NiwwLDBdLFsyNzIsMCwwXSxbMjg4LDAsMF0sWzMwNCwwLDBdLFszMjAsMCwwXSxbMzM2LDAsMF0sWzM1MiwwLDBdLFszNjgsMCwwXSxbMzg0LDAsMF0sWzQwMCwwLDBdLFs0MTYsMCwwXSxbNDMyLDAsMF0sWzQ0OCwwLDBdLFs0NjQsMCwwXSxbNDgwLDAsMF0sWzE2LDQ5NiwwXSxbMzIsNDk2LDBdLFs0OCw0OTYsMF0sWzY0LDQ5NiwwXSxbODAsNDk2LDBdLFs5Niw0OTYsMF0sWzExMiw0OTYsMF0sWzEyOCw0OTYsMF0sWzE0NCw0OTYsNF0sWzE0NCw0ODAsNF0sWzE0NCw0NjQsNF0sWzE0NCw0NDgsNF0sWzIyNCw0NDgsNF0sWzMwNCw0ODAsNF0sWzMwNCw0NjQsNF0sWzMwNCw0NDgsNF0sWzMyMCw0NDgsNF0sWzMzNiw0NDgsNF0sWzM1Miw0NDgsNF0sWzM2OCw0NDgsM10sWzM4NCw0NDgsM10sWzQwMCw0NDgsM10sWzQxNiw0NDgsM10sWzMzNiw0OTYsNF0sWzM1Miw0OTYsNF0sWzM2OCw0OTYsNF0sWzM4NCw0OTYsNF0sWzQwMCw0OTYsNF0sWzQxNiw0OTYsNF0sWzQzMiw0OTYsNF0sWzQ0OCw0OTYsNF0sWzQ2NCw0OTYsNF0sWzQ4MCw0OTYsNF0sWzI4OCw0OTYsNV0sWzMwNCw0OTYsNV0sWzMyMCw0OTYsNV0sWzMyMCw0ODAsNS4xXSxbMjU2LDQ4MCw1XSxbMjcyLDQ4MCw1XSxbMjg4LDQ4MCw1XSxbMTQ0LDQzMiw1XSxbMTYwLDQzMiw1XSxbMTc2LDQzMiw1XSxbMTkyLDQzMiw1XSxbMjA4LDQzMiw1XSxbMjI0LDQzMiw1XSxbMTYsMzg0LDVdLFszMiwzODQsNV0sWzQ4LDM4NCw1XSxbNjQsMzg0LDVdLFs4MCwzODQsNV0sWzk2LDM4NCw1XSxbMTYsMzM2LDRdLFszMiwzMzYsNF0sWzQ4LDMzNiw0XSxbNjQsMzM2LDRdLFs4MCwzMzYsNF0sWzk2LDMzNiw0XSxbMTEyLDMzNiwzXSxbMTI4LDMzNiwzXSxbMTQ0LDMzNiwzXSxbMTYwLDMzNiwzXSxbMTc2LDMyMCw1XSxbMTc2LDMwNCw1XSxbMTc2LDI4OCw1XSxbMTc2LDI3Miw1XSxbMTc2LDI1Niw1XSxbMTc2LDMzNiw1XSxbMTkyLDMzNiw1XSxbMjA4LDMzNiw1XSxbMjI0LDMzNiw1XSxbMjQwLDMzNiw1XSxbMjA4LDMyMCw1LjFdLFsyNTYsMzM2LDNdLFsyNzIsMzM2LDNdLFsyODgsMzM2LDNdLFszMDQsMzM2LDZdLFszMjAsMzM2LDZdLFszMzYsMzM2LDZdLFszNTIsMzM2LDZdLFszNjgsMzM2LDZdLFszNjgsMzUyLDBdLFszNjgsMzM2LDBdLFszNjgsMzIwLDBdLFszNjgsMzA0LDBdLFszNjgsMjg4LDBdLFszODQsMjg4LDZdLFs0MDAsMjg4LDZdLFs0MTYsMjg4LDZdLFs0MzIsMjg4LDZdLFs0NDgsMjg4LDZdLFs0NjQsMjg4LDZdLFs0ODAsMjg4LDZdLFszODQsMzUyLDVdLFs0MDAsMzUyLDVdLFs0MTYsMzUyLDVdLFs0MzIsMzUyLDVdLFs0NDgsMzUyLDVdLFs0NjQsMzUyLDVdLFs0ODAsMzUyLDVdLFs0MDAsMzIwLDJdLFsyNDAsMTEyLDQuMV0sWzE2LDgwLDBdLFszMiw4MCwwXSxbNDgsODAsMF0sWzY0LDgwLDNdLFs4MCw4MCwzXSxbOTYsODAsM10sWzExMiw4MCwwXSxbMTI4LDgwLDBdLFsxNDQsODAsMF0sWzE2MCw4MCwwXSxbMTQ0LDY0LDRdLFsxNDQsNDgsNF0sWzE0NCwzMiw0XSxbMTQ0LDE2LDRdLFsxNzYsODAsM10sWzE5Miw4MCwzXSxbMjA4LDgwLDNdLFsyMDgsMTI4LDNdLFsyMDgsMTEyLDNdLFsyMDgsOTYsM10sWzIyNCwxMjgsNF0sWzI0MCwxMjgsNF0sWzI1NiwxMjgsNF0sWzI3MiwxMjgsNF0sWzIwOCwxNDQsM10sWzIyNCwxNDQsM10sWzI0MCwxNDQsM10sWzI1NiwxNDQsM10sWzI3MiwxNDQsM10sWzI4OCwxNDQsM10sWzMwNCwxNDQsM10sWzMyMCwxNDQsM10sWzMzNiwxNDQsM10sWzM1MiwxNDQsM10sWzM2OCwxNDQsM10sWzM4NCwxNDQsM10sWzM4NCwxMjgsM10sWzM4NCwxMTIsM10sWzM4NCw5NiwzXSxbMzg0LDgwLDNdLFsyODgsMTI4LDNdLFsyODgsMTEyLDNdLFsyODgsOTYsM10sWzMwNCwxMjgsNV0sWzMyMCwxMjgsNV0sWzMzNiwxMjgsNV0sWzM1MiwxMjgsNV0sWzM2OCwxMjgsNV0sWzM2OCwxMTIsNV0sWzM2OCw5Niw1XSxbMzY4LDgwLDVdLFs0MDAsODAsM10sWzQxNiw4MCwzXSxbNDMyLDgwLDNdLFs0NDgsODAsM10sWzQwMCwxNDQsNV0sWzQxNiwxNDQsNV0sWzQzMiwxNDQsNV0sWzQ0OCwxNDQsNV0sWzQ2NCwxNDQsNV0sWzQ4MCwxNDQsNV0sWzQxNiwxMjgsNi4xXSxbMTYwLDE5Miw2XSxbMTc2LDE5Miw2XSxbMTkyLDE5Miw2XSxbMjA4LDE5Miw2XSxbMjI0LDE5Miw2XSxbMjQwLDE5Miw2XSxbMjU2LDE5Miw2XSxbMjcyLDE5Miw2XSxbMjg4LDE5Miw2XSxbMzA0LDE5Miw2XSxbMzIwLDE5Miw2XSxbMzM2LDE5Miw2XSxbMzUyLDE5Miw2XSxbMzY4LDE5Miw2XSxbMzg0LDE5Miw2XSxbNDAwLDE5Miw2XSxbNDE2LDE5Miw2XSxbNDMyLDE5Miw2XSxbNDQ4LDE5Miw2XSxbNDY0LDE5Miw2XSxbNDgwLDE5Miw2XSxbODAsMTkyLDNdLFs5NiwxOTIsM10sWzExMiwxOTIsM10sWzEyOCwxOTIsM10sWzE0NCwxOTIsM10sWzE2LDE5MiwwXSxbMzIsMTkyLDBdLFs0OCwxOTIsMF0sWzY0LDE5MiwwXSxbMzIsMTc2LDUuMV0sWzIwOCw0NDgsNF0sWzIwOCw0NjQsNF0sWzIwOCw0ODAsNF0sWzIwOCw0OTYsNF0sWzI0MCw0NDgsNF0sWzI0MCw0NjQsNF0sWzI0MCw0ODAsNF0sWzI0MCw0OTYsNF0sWzI0MCw0MzIsNV0sWzExMiwzODQsNV0sWzMyLDY0LDQuMV0sWzMyLDQ4LDFdLFszMiw0ODAsNC4xXSxbMzIsNDY0LDFdLF0=");
            break;
        }
        case 5: {
            readCode("WyxbMCw0OTYsMF0sWzAsNDgwLDBdLFswLDQ2NCwwXSxbMCw0NDgsMF0sWzAsNDMyLDBdLFs4MCw0OTYsM10sWzk2LDQ5NiwzXSxbMTEyLDQ5NiwzXSxbMTI4LDQ5NiwzXSxbMTQ0LDQ5Niw0XSxbMTYwLDQ5Niw0XSxbMTc2LDQ5Niw0XSxbMTkyLDQ5Niw0XSxbMCwwLDBdLFswLDE2LDBdLFswLDMyLDBdLFswLDQ4LDBdLFswLDY0LDBdLFswLDgwLDBdLFswLDk2LDBdLFswLDExMiwwXSxbMCwxMjgsMF0sWzAsMTQ0LDBdLFswLDE2MCwwXSxbMCwxNzYsMF0sWzAsMTkyLDBdLFswLDIwOCwwXSxbMCwyMjQsMF0sWzAsMjQwLDBdLFswLDI1NiwwXSxbMCwyNzIsMF0sWzAsMjg4LDBdLFswLDMwNCwwXSxbMCwzMjAsMF0sWzAsMzM2LDBdLFswLDM1MiwwXSxbMCwzNjgsMF0sWzAsMzg0LDBdLFswLDQwMCwwXSxbMCw0MTYsMF0sWzE2LDAsMF0sWzMyLDAsMF0sWzQ4LDAsMF0sWzY0LDAsMF0sWzgwLDAsMF0sWzk2LDAsMF0sWzExMiwwLDBdLFsxMjgsMCwwXSxbMTQ0LDAsMF0sWzE2MCwwLDBdLFsxNzYsMCwwXSxbMTkyLDAsMF0sWzIwOCwwLDBdLFsyMjQsMCwwXSxbMjQwLDAsMF0sWzI1NiwwLDBdLFsyNzIsMCwwXSxbMjg4LDAsMF0sWzMwNCwwLDBdLFszMjAsMCwwXSxbMzM2LDAsMF0sWzM1MiwwLDBdLFszODQsMCwwXSxbNDAwLDAsMF0sWzQxNiwwLDBdLFs0MzIsMCwwXSxbNDQ4LDAsMF0sWzQ2NCwwLDBdLFs0ODAsMCwwXSxbNDk2LDAsMF0sWzQ5NiwxNiwwXSxbNDk2LDMyLDBdLFs0OTYsNDgsMF0sWzQ5Niw2NCwwXSxbNDk2LDgwLDBdLFs0OTYsOTYsMF0sWzQ5NiwxMTIsMF0sWzQ5NiwxMjgsMF0sWzQ5NiwxNDQsMF0sWzQ5NiwxNjAsMF0sWzQ5NiwxNzYsMF0sWzQ5NiwxOTIsMF0sWzQ5NiwyMDgsMF0sWzQ5NiwyMjQsMF0sWzQ5NiwyNDAsMF0sWzQ5NiwyNTYsMF0sWzQ5NiwyNzIsMF0sWzQ5NiwyODgsMF0sWzQ5NiwzMDQsMF0sWzQ5NiwzMjAsMF0sWzQ5NiwzMzYsMF0sWzQ5NiwzNTIsMF0sWzQ5NiwzNjgsMF0sWzQ5NiwzODQsMF0sWzQ5Niw0MDAsMF0sWzQ5Niw0MTYsMF0sWzQ5Niw0MzIsMF0sWzQ4MCw2NCwwXSxbNDY0LDY0LDBdLFs0NDgsNjQsMF0sWzQxNiw0OCw0LjFdLFszODQsNjQsMF0sWzM2OCw2NCwwXSxbNDAwLDY0LDVdLFs0MTYsNjQsNV0sWzQzMiw2NCw1XSxbNDY0LDMyLDFdLFs0NjQsNDgsNS4xXSxbMzY4LDQ4LDBdLFszNjgsMzIsMF0sWzM2OCwxNiwwXSxbMzY4LDAsMF0sWzM2OCwxNDQsMF0sWzM4NCwxNDQsMF0sWzQwMCwxNDQsMF0sWzQxNiwxMjgsM10sWzQzMiwxMjgsM10sWzQ0OCwxMjgsM10sWzQ2NCwxMjgsM10sWzQ4MCwxMjgsM10sWzQxNiwxNDQsMF0sWzY0LDQ5Niw1XSxbNDgsNDk2LDVdLFszMiw0OTYsNV0sWzE2LDQ5Niw1XSxbMzIsNDY0LDFdLFszMiw0ODAsNS4xXSxbNjQsNDgwLDRdLFs2NCw0NjQsNF0sWzY0LDQ0OCw0XSxbMTkyLDQ4MCw1XSxbMTkyLDQ2NCw1XSxbMTkyLDQ0OCw1XSxbNjQsNDMyLDBdLFs0OCw0MzIsMF0sWzMyLDQzMiwwXSxbMTYsNDMyLDBdLFsyMDgsNDQ4LDRdLFsyMDgsNDY0LDRdLFsyMDgsNDgwLDRdLFsyMDgsNDk2LDRdLFsyMjQsNDQ4LDRdLFsyNDAsNDQ4LDRdLFsyNTYsNDQ4LDRdLFsyNzIsNDQ4LDRdLFsyODgsNDQ4LDRdLFszMDQsNDk2LDRdLFsyMjQsNDk2LDBdLFsyNDAsNDk2LDBdLFsyNTYsNDk2LDBdLFsyNzIsNDk2LDBdLFszMDQsNDQ4LDRdLFszMDQsNDY0LDRdLFszMDQsNDgwLDRdLFsyODgsNDk2LDBdLFsyNTYsNDgwLDYuMV0sWzY0LDQxNiw2XSxbNjQsNDAwLDZdLFs2NCwzODQsNl0sWzQzMiwxNDQsMF0sWzQ0OCwxNDQsMF0sWzQ2NCwxNDQsMF0sWzQ4MCwxNDQsMF0sWzM1MiwxNDQsNl0sWzMzNiwxNDQsNl0sWzMyMCwxNDQsNl0sWzI4OCwxNDQsMF0sWzM4NCw0OTYsNF0sWzQwMCw0NDgsNF0sWzQwMCw0OTYsNF0sWzQwMCw0ODAsNF0sWzQwMCw0NjQsNF0sWzQxNiw0NDgsNF0sWzQzMiw0NDgsNF0sWzM1Miw0ODAsNS4xXSxbMzA0LDE2MCw2XSxbMzA0LDE3Niw2XSxbMzA0LDE5Miw2XSxbMzIwLDE5Miw2XSxbMzM2LDE5Miw2XSxbMzUyLDE5Miw2XSxbMzY4LDE5Miw2XSxbMzA0LDIwOCwzXSxbMzIwLDIwOCwzXSxbMzM2LDIwOCwzXSxbMzUyLDIwOCwzXSxbMzY4LDIwOCwzXSxbMzA0LDE0NCw2XSxbMjg4LDE2MCwwXSxbMjg4LDE3NiwwXSxbMjg4LDE5MiwwXSxbMjg4LDIwOCwwXSxbNDMyLDE5MiwwXSxbNDMyLDIwOCwwXSxbNDAwLDIwOCwzXSxbMzg0LDIwOCwzXSxbNDAwLDE3Niw1LjFdLFszODQsMTkyLDBdLFs0MDAsMTkyLDBdLFs0MTYsMTkyLDBdLFs0NDgsNDQ4LDRdLFs0NjQsNDQ4LDRdLFs0ODAsNDQ4LDRdLFs4MCw0MTYsNF0sWzgwLDQwMCw0XSxbODAsMzg0LDRdLFsxNzYsNDQ4LDVdLFsxNjAsNDQ4LDVdLFsxNDQsNDQ4LDVdLFsxMjgsNDQ4LDVdLFs4MCw0MzIsNV0sWzk2LDQzMiw1XSxbMTEyLDQzMiw1XSxbMTI4LDQzMiw1XSxbMzIwLDQ5Niw0XSxbMzM2LDQ5Niw1XSxbMzUyLDQ5Niw1XSxbMzY4LDQ5Niw1XSxbMjg4LDEyOCwzXSxbMjg4LDExMiwzXSxbMjg4LDk2LDNdLFsyODgsODAsM10sWzI4OCw2NCwzXSxbMjg4LDQ4LDNdLFsyODgsMzIsM10sWzI4OCwxNiwzXSxbNDgwLDI3MiwwXSxbNDY0LDI3MiwwXSxbNDQ4LDI3MiwwXSxbNDMyLDI3MiwwXSxbMzg0LDI3Miw0XSxbMzY4LDI3Miw0XSxbMzUyLDI3Miw0XSxbMzM2LDI3Miw0XSxbNjQsMzY4LDZdLFs2NCwzNTIsNl0sWzY0LDMzNiw2XSxbOTYsMzg0LDRdLFsxMTIsMzg0LDRdLFsxMjgsMzg0LDRdLFsxNDQsMzg0LDRdLFsyODgsMjU2LDRdLFsyODgsMjQwLDRdLFsyODgsMjI0LDRdLFszMjAsMjcyLDBdLFszMDQsMjcyLDBdLFsyODgsMjcyLDBdLFsyNzIsMjcyLDBdLFsyNTYsMjcyLDBdLFsyNDAsMjU2LDYuMV0sWzI0MCwyNzIsMF0sWzIyNCwyNzIsMF0sWzIwOCwyNzIsMF0sWzE5MiwyNzIsMF0sWzE5MiwyNTYsMF0sWzE5MiwyNDAsMF0sWzE5MiwyMjQsMF0sWzE5MiwyMDgsMF0sWzIwOCwyMDgsMF0sWzIyNCwyMDgsMF0sWzI0MCwyMDgsMF0sWzI1NiwyMDgsMF0sWzI3MiwyMDgsMF0sWzE2MCwzODQsM10sWzE3NiwzODQsM10sWzE5MiwzODQsM10sWzIwOCwzODQsM10sWzI0MCwzODQsNF0sWzI1NiwzODQsNF0sWzIyNCwzODQsM10sWzI3MiwzODQsNF0sWzI4OCwzODQsNF0sWzMwNCwzODQsNF0sWzgwLDM2OCw2XSxbOTYsMzY4LDZdLFsxMTIsMzY4LDZdLFsxMjgsMzY4LDZdLFsxNDQsMzY4LDZdLFsxNjAsMzY4LDZdLFsxNzYsMzY4LDZdLFsxOTIsMzY4LDZdLFsyMDgsMzY4LDZdLFszMjAsMzg0LDBdLFszMjAsMzY4LDBdLFszMjAsMzUyLDBdLFszMjAsMzM2LDBdLFszMjAsMzIwLDBdLFszMjAsMzA0LDBdLFszMjAsMjg4LDBdLFsyODgsMzUyLDUuMV0sWzI3MiwzNjgsNV0sWzI4OCwzNjgsNV0sWzMwNCwzNjgsNV0sWzY0LDMyMCw2XSxbNDgsMzIwLDZdLFszMiwzMjAsNl0sWzE2LDMyMCw2XSxbMjI0LDQwMCwzXSxbMjQwLDQwMCwzXSxbMjU2LDQwMCwzXSxbMjcyLDQwMCwzXSxbMjg4LDQwMCwzXSxbMzA0LDQwMCwzXSxbMzIwLDQwMCwzXSxbNDAwLDI4OCwzXSxbMzg0LDI4OCwzXSxbMzY4LDI4OCwzXSxbMzUyLDI4OCwzXSxbMzM2LDI4OCwzXSxbNDE2LDIwOCwzXSxbNDAwLDI3Miw0XSxbNDE2LDI3MiwwXSxbNDE2LDI4OCwwXSxbMzM2LDMwNCwwXSxbMzUyLDMwNCwwXSxbMzY4LDMwNCwwXSxbMzg0LDMwNCwwXSxbNDAwLDMwNCwwXSxbNDE2LDMwNCwwXSxbNDk2LDQ0OCwwXSxbNDE2LDQ5NiwwXSxbNDE2LDQ4MCwwXSxbNDE2LDQ2NCwwXSxbNDMyLDQ2NCwwXSxbNDQ4LDQ2NCwwXSxbNDY0LDQ2NCwwXSxbNDgwLDQ2NCwwXSxbNDk2LDQ2NCwwXSxbNDgsMjA4LDcsMV0sWzQ4LDE5Miw3LDFdLFs5NiwyNzIsMF0sWzk2LDI1NiwwXSxbOTYsMjQwLDBdLFs5NiwyMjQsMF0sWzk2LDIwOCwwXSxbOTYsMTkyLDBdLFs5NiwxNzYsMF0sWzY0LDI3MiwwXSxbODAsMjcyLDBdLFszMiwyMjQsMF0sWzE2LDIyNCwwXSxbNjQsMTc2LDBdLFs4MCwxNzYsMF0sWzQ4LDI3MiwwXSxbNDgsMjI0LDBdLFs0OCwxNzYsMF0sWzE0NCwyNDAsMl0sWzY0LDE2MCw0LjFdLFs0MTYsMjU2LDQuMV0sXSxbLFswLDQ5NiwwXSxbMCw0ODAsMF0sWzAsNDY0LDBdLFswLDQ0OCwwXSxbMCw0MzIsMF0sWzAsMCwwXSxbMCwxNiwwXSxbMCwzMiwwXSxbMCw0OCwwXSxbMCw2NCwwXSxbMCw4MCwwXSxbMCw5NiwwXSxbMCwxMTIsMF0sWzAsMTI4LDBdLFswLDE0NCwwXSxbMCwxNjAsMF0sWzAsMTc2LDBdLFswLDE5MiwwXSxbMCwyMDgsMF0sWzAsMjI0LDBdLFswLDI0MCwwXSxbMCwyNTYsMF0sWzAsMjcyLDBdLFswLDI4OCwwXSxbMCwzMDQsMF0sWzAsMzIwLDBdLFswLDMzNiwwXSxbMCwzNTIsMF0sWzAsMzY4LDBdLFswLDM4NCwwXSxbMCw0MDAsMF0sWzAsNDE2LDBdLFsxNiwwLDBdLFszMiwwLDBdLFs0OCwwLDBdLFs2NCwwLDBdLFs4MCwwLDBdLFs5NiwwLDBdLFsxMTIsMCwwXSxbMTI4LDAsMF0sWzE0NCwwLDBdLFsxNjAsMCwwXSxbMTc2LDAsMF0sWzE5MiwwLDBdLFsyMDgsMCwwXSxbMjI0LDAsMF0sWzI0MCwwLDBdLFsyNTYsMCwwXSxbMjcyLDAsMF0sWzI4OCwwLDBdLFszMDQsMCwwXSxbMzIwLDAsMF0sWzMzNiwwLDBdLFszNTIsMCwwXSxbMzg0LDAsMF0sWzQwMCwwLDBdLFs0MTYsMCwwXSxbNDMyLDAsMF0sWzQ0OCwwLDBdLFs0NjQsMCwwXSxbNDgwLDAsMF0sWzQ5NiwwLDBdLFs0OTYsMTYsMF0sWzQ5NiwzMiwwXSxbNDk2LDQ4LDBdLFs0OTYsNjQsMF0sWzQ5Niw4MCwwXSxbNDk2LDk2LDBdLFs0OTYsMTEyLDBdLFs0OTYsMTI4LDBdLFs0OTYsMTQ0LDBdLFs0OTYsMTYwLDBdLFs0OTYsMTc2LDBdLFs0OTYsMTkyLDBdLFs0OTYsMjA4LDBdLFs0OTYsMjI0LDBdLFs0OTYsMjQwLDBdLFs0OTYsMjU2LDBdLFs0OTYsMjcyLDBdLFs0OTYsMjg4LDBdLFs0OTYsMzA0LDBdLFs0OTYsMzIwLDBdLFs0OTYsMzM2LDBdLFs0OTYsMzUyLDBdLFs0OTYsMzY4LDBdLFs0OTYsMzg0LDBdLFs0OTYsNDAwLDBdLFs0OTYsNDE2LDBdLFs0OTYsNDMyLDBdLFszNjgsMCwwXSxbMjg4LDIwOCwwXSxbMzIwLDI3MiwwXSxbMzA0LDI3MiwwXSxbMjg4LDI3MiwwXSxbMjcyLDI3MiwwXSxbMjU2LDI3MiwwXSxbMjQwLDI3MiwwXSxbMjI0LDI3MiwwXSxbMjA4LDI3MiwwXSxbMTkyLDI3MiwwXSxbMTkyLDI1NiwwXSxbMTkyLDI0MCwwXSxbMTkyLDIyNCwwXSxbMTkyLDIwOCwwXSxbMjA4LDIwOCwwXSxbMjI0LDIwOCwwXSxbMjQwLDIwOCwwXSxbMjU2LDIwOCwwXSxbMjcyLDIwOCwwXSxbOTYsMjcyLDBdLFs5NiwyNTYsMF0sWzk2LDI0MCwwXSxbOTYsMjI0LDBdLFs5NiwyMDgsMF0sWzk2LDE5MiwwXSxbOTYsMTc2LDBdLFs4MCw0OTYsMF0sWzY0LDQ5NiwwXSxbNDgsNDk2LDBdLFszMiw0OTYsMF0sWzE2LDQ5NiwwXSxbMTQ0LDQ5NiwwXSxbMTYwLDQ5NiwwXSxbMTc2LDQ5NiwwXSxbMTkyLDQ5NiwwXSxbMjA4LDQ5NiwwXSxbMjI0LDQ5NiwwXSxbMjQwLDQ5NiwwXSxbMjU2LDQ5NiwwXSxbMjcyLDQ5NiwwXSxbMjg4LDQ5NiwwXSxbMzA0LDQ5NiwwXSxbMzIwLDQ5NiwwXSxbMzM2LDQ5NiwwXSxbMzUyLDQ5NiwwXSxbMzY4LDQ5NiwwXSxbMzg0LDQ5NiwwXSxbNDAwLDQ5NiwwXSxbNDE2LDQ5NiwwXSxbNjQsMTc2LDBdLFs4MCwxNzYsMF0sWzMyLDIyNCwwXSxbMTYsMjI0LDBdLFs2NCwyNzIsMF0sWzgwLDI3MiwwXSxbNDgsMTc2LDBdLFs0OCwyMjQsMF0sWzQ4LDI3MiwwXSxbNjQsMTYwLDQuMV0sWzk2LDMyMCwwXSxbODAsMzIwLDBdLFs2NCwzMjAsMF0sWzQ4LDMyMCwwXSxbMzIsMzIwLDBdLFsxNiwzMjAsMF0sWzk2LDMwNCwwXSxbOTYsMjg4LDBdLFsxMTIsMTkyLDNdLFsxMjgsMTkyLDNdLFsxNDQsMTkyLDNdLFsxNjAsMTkyLDNdLFsxNzYsMTkyLDNdLFsxOTIsMTkyLDNdLFsyMDgsMTkyLDNdLFsyMjQsMTkyLDNdLFsyNDAsMTkyLDNdLFsyNTYsMTkyLDNdLFsyNTYsMTc2LDRdLFsyNDAsMTc2LDRdLFsyMjQsMTc2LDRdLFsxNDQsMTc2LDRdLFsxMjgsMTc2LDRdLFsxMTIsMTc2LDRdLFsyNzIsMTc2LDVdLFsyNzIsMTYwLDVdLFsyNzIsMTQ0LDVdLFsxNzYsMTc2LDNdLFsxOTIsMTc2LDNdLFsyMDgsMTc2LDNdLFsxNjAsMTc2LDNdLFszMDQsMjU2LDUuMV0sWzMwNCwyMDgsMF0sWzMyMCwyMDgsMF0sWzMyMCwyNTYsNF0sWzMyMCwyNDAsNF0sWzMyMCwyMjQsNF0sWzI4OCwxNDQsNV0sWzMwNCwxNDQsNV0sWzMyMCwxNDQsNV0sWzMyMCwxMjgsNV0sWzMyMCwxMTIsNV0sWzMyMCw5Niw1XSxbNDE2LDk2LDVdLFs0MzIsOTYsNV0sWzQ0OCw5Niw1XSxbNDY0LDk2LDVdLFs0ODAsOTYsNV0sWzQ0OCw4MCw2LjFdLFsyODgsMTc2LDNdLFsyODgsMTYwLDNdLFszMzYsMTQ0LDNdLFszMzYsMTI4LDNdLFszMzYsMTEyLDNdLFszNTIsMTEyLDNdLFszNjgsMTEyLDNdLFszODQsOTYsM10sWzM2OCw5NiwzXSxbMzM2LDIwOCwwXSxbMzUyLDIwOCwwXSxbMzY4LDIwOCwwXSxbMzg0LDIwOCwwXSxbNDAwLDIyNCwwXSxbNDAwLDI0MCwwXSxbNDAwLDI1NiwwXSxbNDAwLDI3MiwwXSxbNDAwLDI4OCwwXSxbNDAwLDMwNCwwXSxbNDAwLDMyMCwwXSxbMzM2LDMzNiw2XSxbMzUyLDMzNiw2XSxbMzY4LDMzNiw2XSxbMzg0LDMzNiw2XSxbNDAwLDMzNiwwXSxbMzM2LDM1MiwzXSxbMzUyLDM1MiwzXSxbMzY4LDM1MiwzXSxbMzg0LDM1MiwzXSxbNDAwLDM1MiwwXSxbNDAwLDM2OCwwXSxbMzg0LDM2OCwwXSxbMzY4LDM2OCwwXSxbMzUyLDM2OCwwXSxbMzM2LDM2OCwwXSxbMzIwLDM2OCwwXSxbMzIwLDM1MiwzXSxbMzA0LDM1MiwzXSxbMzIwLDMzNiw2XSxbMzA0LDMzNiw2XSxbMzA0LDM2OCwwXSxbNDMyLDIwOCw2XSxbNDQ4LDIwOCw2XSxbNDY0LDIwOCw2XSxbNDAwLDIwOCwwXSxbMjg4LDE5MiwzXSxbMzg0LDExMiwzXSxbMzA0LDE2MCwzXSxbMzIwLDE2MCwzXSxbMzM2LDE2MCwzXSxbMjcyLDE5MiwzXSxbMzM2LDE3NiwzXSxbMzM2LDE5MiwzXSxbMzA0LDE5MiwzXSxbMzIwLDE5MiwzXSxbMzIwLDE3NiwzXSxbMzA0LDE3NiwzXSxbMzUyLDE5MiwzXSxbMzY4LDE5MiwzXSxbMzg0LDE5MiwzXSxbNDAwLDEyOCwwXSxbNDAwLDE0NCwwXSxbNDAwLDE2MCwwXSxbNDAwLDE3NiwwXSxbNDAwLDE5MiwwXSxbNDAwLDExMiwwXSxbNDAwLDk2LDBdLFszNTIsOTYsM10sWzMzNiw5Niw1XSxbMjg4LDM2OCwwXSxbMjg4LDM1MiwwXSxbMjg4LDMzNiwwXSxbMjcyLDMzNiwwXSxbMjU2LDMzNiwwXSxbMjQwLDMzNiwwXSxbMjQwLDMyMCw2XSxbMjQwLDMwNCw2XSxbMjQwLDI4OCw2XSxbMjcyLDMyMCw0LjFdLFsyMjQsMzM2LDRdLFsyMDgsMzM2LDRdLFsxOTIsMzM2LDRdLFsxMjgsMzM2LDRdLFsxMTIsMzM2LDRdLFs5NiwzMzYsNF0sWzE3NiwzMzYsM10sWzE2MCwzMzYsM10sWzE0NCwzMzYsM10sWzQ0OCwyODgsM10sWzQxNiwyMDgsMF0sWzQ4MCwyMDgsMF0sWzE3NiwzNTIsM10sWzE5MiwzNTIsM10sWzIwOCwzNTIsM10sWzIyNCwzNTIsM10sWzI0MCwzNTIsM10sWzI1NiwzNTIsM10sWzI3MiwzNTIsM10sWzE0NCwzNTIsNV0sWzE0NCwzNjgsNV0sWzE0NCwzODQsNV0sWzE0NCw0MDAsNV0sWzM4NCw0ODAsNS4xXSxbNDE2LDQzMiw0XSxbNDMyLDQzMiw0XSxbNDQ4LDQzMiw0XSxbNDY0LDQzMiw0XSxbNDgwLDQzMiw0XSxbNDE2LDQ0OCw0XSxbNDE2LDQ2NCw0XSxbNDE2LDQ4MCw0XSxbNDMyLDQ5NiwzXSxbNDQ4LDQ5NiwzXSxbNDY0LDQ5NiwzXSxbNDgwLDQ5NiwzXSxbNDk2LDQ5NiwzXSxbNDk2LDQ4MCwzXSxbNDk2LDQ2NCwzXSxbNDk2LDQ0OCwzXSxbMzM2LDQ4MCw1XSxbMzM2LDQ2NCw1XSxbMzM2LDQ0OCw1XSxbMzM2LDQzMiw1XSxbMzM2LDQxNiw1XSxbMzM2LDQwMCw1XSxbMzM2LDM4NCw1XSxbMTYwLDQwMCwzXSxbMTYwLDM4NCwzXSxbMTYwLDM2OCwzXSxbMTYwLDM1MiwzXSxbMjU2LDQzMiwzXSxbMjU2LDQ0OCwzXSxbMjU2LDQ2NCwzXSxbMjU2LDQ4MCwzXSxbODAsNDMyLDNdLFs5Niw0MzIsM10sWzExMiw0MzIsM10sWzEyOCw0MzIsM10sWzE0NCw0MzIsM10sWzE2MCw0MzIsM10sWzE2MCw0MTYsM10sWzE3Niw0MzIsM10sWzE5Miw0MzIsM10sWzIwOCw0MzIsM10sWzIyNCw0MzIsM10sWzI0MCw0MzIsM10sWzE0NCw0MTYsNV0sWzEyOCw0MTYsNV0sWzExMiw0MTYsNV0sWzk2LDQxNiw1XSxbODAsNDE2LDVdLFs2NCw0MTYsNV0sWzQ4LDQxNiw1XSxbMzIsNDE2LDVdLFsxNiw0MTYsNV0sWzMyLDQwMCw2LjFdLFsxNDQsNDgwLDZdLFsxNDQsNDY0LDZdLFsxNDQsNDQ4LDZdLFsyMjQsNDY0LDJdLFs5Niw0OTYsMF0sWzExMiw0OTYsMF0sWzEyOCw0OTYsMF0sXQ==");
            break;
        }
        default: {
            break;
        }
    }
}

function listFromEList() {
    worldShift = 0;
    readFromEWorldList();
    gameObjectList = [];
    for (var i = 0; i < eGameObjectList.length; i++) {
        gameObjectList.push(new GameObject(eGameObjectList[i].pos.x, eGameObjectList[i].pos.y, eGameObjectList[i].type));
        if (eGameObjectList[i].type == GAMEOBJECTTYPE.ALTER) {
            gameObjectList[i].shift = Number(eGameObjectList[i].shift);
        }
    }
}

function generateCode() {
    saveToEWorldList();

    var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}
    code = [];
    for (var j = 0; j < eWorldList.length; j++) {
        worldShift = j;
        readFromEWorldList()
        code.push("[");
        for (var i = 0; i < eGameObjectList.length; i++) {
            if (eGameObjectList[i].type == GAMEOBJECTTYPE.ALTER) {
                code.push("["+String([eGameObjectList[i].pos.x, eGameObjectList[i].pos.y, eGameObjectList[i].type, eGameObjectList[i].shift])+"]");
            } else {
                code.push("["+String([eGameObjectList[i].pos.x, eGameObjectList[i].pos.y, eGameObjectList[i].type])+"]");
            }
        }
        code.push("]");
    }
    return Base64.encode(String(code));
}

function readCode(code) {
    var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}
    var decoded = Base64.decode(code);
    decoded = decoded.split("],[");
    decoded[0] = decoded[0].slice(3);
    decoded[decoded.length - 1] = decoded[decoded.length - 1].slice(0, -3);
    eWorldList = [];
    worldList = [];
    eGameObjectList = [];
    gameObjectList = [];

    worldShift = 0;

    eWorldList.push([]);
    for (var i = 0; i < decoded.length; i++) {
        var temp;
        if (decoded[i].split("[").length > 1) {
            temp = decoded[i].slice(2).split(",");
        } else if (decoded[i].split("]").length > 1) {
            temp = decoded[i].slice(0, -2).split(",");
        } else {
            temp = decoded[i].split(",");
        }

        eWorldList[worldShift].push(new GameObject(Number(temp[0]), Number(temp[1]), Number(temp[2])));
        if (Number(temp[2]) == GAMEOBJECTTYPE.ALTER) {
            eWorldList[worldShift][i].shift = Number(temp[3]);
        }

        if (decoded[i].split("]").length > 1) {
            worldShift++;
            eWorldList.push([]);
        }
    }

    // egameobjectlist
    worldShift = 0;
    readFromEWorldList();

    // real
    listFromEList();
    worldFromEWorld();
}

function removeGameObject() {
    for (var i = 0; i < eGameObjectList.length; i++) {
        if (eGameObjectList[i].pos.x == gameObjectSize * Math.floor(mouseX / gameObjectSize) && eGameObjectList[i].pos.y == gameObjectSize * Math.floor(mouseY / gameObjectSize)) {
            eGameObjectList.splice(i, 1);
        }
    }
}

function placeGameObject(type) {
    if (gameObjectSize * Math.floor(mouseX / gameObjectSize) >= 0 && gameObjectSize * Math.floor(mouseX / gameObjectSize) <= 496 && 
        gameObjectSize * Math.floor(mouseY / gameObjectSize) >= 0 && gameObjectSize * Math.floor(mouseY / gameObjectSize) <= 496) {
            removeGameObject();
            eGameObjectList.push(new GameObject(gameObjectSize * Math.floor(mouseX / gameObjectSize), gameObjectSize * Math.floor(mouseY / gameObjectSize), type));
    }
}

function appendToEWorldList() {
    for (var i = 0; i < eGameObjectList.length; i++) {
        eWorldList[worldShift].push(new GameObject(eGameObjectList[i].pos.x, eGameObjectList[i].pos.y, eGameObjectList[i].type));
        if (eGameObjectList[i].type == GAMEOBJECTTYPE.ALTER) {
            eWorldList[worldShift][i].shift = Number(eGameObjectList[i].shift);
        }
    }
}

function saveToEWorldList() {
    while (eWorldList.length < worldShift) {
        eWorldList.push([]);
    }
    if (worldShift == eWorldList.length) {
        eWorldList.push([]);
        appendToEWorldList();
    } else {
        eWorldList[worldShift] = [];
        appendToEWorldList();
    }
}

function readFromEWorldList() {
    eGameObjectList = [];
    if (eWorldList.length > worldShift) {
        for (var i = 0; i < eWorldList[Number(worldShift)].length; i++) {
            eGameObjectList.push(new GameObject(eWorldList[Number(worldShift)][i].pos.x, eWorldList[Number(worldShift)][i].pos.y, eWorldList[Number(worldShift)][i].type));
            if (eWorldList[Number(worldShift)][i].type == GAMEOBJECTTYPE.ALTER) {
                eGameObjectList[i].shift = Number(eWorldList[Number(worldShift)][i].shift);
            }
        }
    } else {
        while(eWorldList.length > worldShift) {
            eWorldList.push([]);
        }
    }
}

function readFromWorldList() {
    // remove all elements, store players
    tempPlayerList = [];
    for (var i = 0; i < gameObjectList.length; i++) {
        if (gameObjectList[i].type == GAMEOBJECTTYPE.PLAYER) {
            tempPlayerList.push(new GameObject(gameObjectList[i].pos.x, gameObjectList[i].pos.y, gameObjectList[i].type));
            tempPlayerList[tempPlayerList.length - 1].vel = new Vector2(gameObjectList[i].vel.x, gameObjectList[i].vel.y);
            tempPlayerList[tempPlayerList.length - 1].accel = new Vector2(gameObjectList[i].accel.x, gameObjectList[i].accel.y);
            tempPlayerList[tempPlayerList.length - 1].onGround = gameObjectList[i].onGround;
        }
    }
    gameObjectList = [];

    // load elements from worldlist
    if (worldList.length > worldShift) {
        for (var i = 0; i < worldList[Number(worldShift)].length; i++) {
            gameObjectList.push(new GameObject(worldList[Number(worldShift)][i].pos.x, worldList[Number(worldShift)][i].pos.y, worldList[Number(worldShift)][i].type));
            if (worldList[Number(worldShift)][i].type == GAMEOBJECTTYPE.ALTER) {
                gameObjectList[i].shift = Number(worldList[Number(worldShift)][i].shift);
            }
        }
    } else {
        while(worldList.length > worldShift) {
            worldList.push([]);
        }
    }

    // load players again
    var beginIndex = gameObjectList.length;
    for (var i = 0; i < tempPlayerList.length; i++) {
        gameObjectList.push(new GameObject(tempPlayerList[i].pos.x, tempPlayerList[i].pos.y, tempPlayerList[i].type));
        gameObjectList[beginIndex + i].vel = new Vector2(tempPlayerList[i].vel.x, tempPlayerList[i].vel.y);
        gameObjectList[beginIndex + i].accel = new Vector2(tempPlayerList[i].accel.x, tempPlayerList[i].accel.y);
        gameObjectList[beginIndex + i].onGround = tempPlayerList[i].onGround;
    }
}

function worldFromEWorld() {
    worldList = [];
    for (var i = 0; i < eWorldList.length; i++) {
        worldList.push([]);
        for (var j = 0; j < eWorldList[i].length; j++) {
            worldList[i].push(new GameObject(eWorldList[i][j].pos.x, eWorldList[i][j].pos.y, eWorldList[i][j].type));
            if (eWorldList[i][j].type == GAMEOBJECTTYPE.ALTER) {
                worldList[i][j].shift = Number(eWorldList[i][j].shift);
            }
        }
    }
}

var gameLevel = 1;

function main() {
    update();
    render();
}

var randomParticles = [];

var editingAlterID = -1;
var editingAlterShift = 0;
var typeTimer = 0;
var typeDelay = 20;

var worldShift = 0;

var codeInputDivElement = document.getElementById("codeInputDiv");
var codeOutputDivElement = document.getElementById("codeOutputDiv");

var codeInputElement = document.getElementById("codeInput");
var codeSubmitElement = document.getElementById("codeSubmit");
var codeOutputElement = document.getElementById("codeOutput");

codeSubmitElement.addEventListener("click", function(ev) {
    readCode(codeInputElement.value);
    codeInputElement.value = "";
});

function update() {
    switch (gameScreen) {
        case GAMESCREENTYPE.NULL_TO_TITLE: {
            for (var i = 0; i < 300; i++) {
                randomParticles.push([new Vector2(Math.random() * 512, Math.random() * 512), new Vector2((Math.random() * 3) - 1.5, (Math.random() * 3) - 1.5), Math.random() * 5]);
            }
            gameScreen = GAMESCREENTYPE.TITLE;
            break;
        }
        case GAMESCREENTYPE.TITLE: {
            // particles
            for (var i = 0; i < randomParticles.length; i++) {
                randomParticles[i][0].x += randomParticles[i][1].x * deltaTime;
                randomParticles[i][0].y += randomParticles[i][1].y * deltaTime;
                if (randomParticles[i][0].x > 512 || randomParticles[i][0].x < 0) {
                    randomParticles[i][1].x *= -1;
                }
                if (randomParticles[i][0].y > 512 || randomParticles[i][0].y < 0) {
                    randomParticles[i][1].y *= -1;
                }
            }
            break;
        }
        case GAMESCREENTYPE.TITLE_TO_GAME: {
            deathAnimTimer = over9000;
            goalAnimTimer = over9000;
            editTimer = over9000;

            randomParticles = [];

            editMode = false;

            gameLevel = 1;
            loadLevel(gameLevel);

            gameScreen = GAMESCREENTYPE.GAME;
            break;
        }
        case GAMESCREENTYPE.TITLE_TO_EDIT: {
            editTimer = over9000;

            randomParticles = [];
            
            editMode = true;

            eWorldList = [];
            eGameObjectList = [];
            worldList = [];
            gameObjectList = [];

            gameScreen = GAMESCREENTYPE.EDIT;
            break;
        }
        case GAMESCREENTYPE.GAME: {
            deathAnimTimer += deltaTime;
            goalAnimTimer += deltaTime;
            editTimer += deltaTime;

            if (editMode) {
                if ((keys[" "] || keys["Enter"]) && editTimer > editDelay) {
                    gameScreen = GAMESCREENTYPE.GAME_TO_EDIT;
                    editTimer = 0;
                }
            }

            for (var i = 0; i < gameObjectList.length; i++) {
                gameObjectList[i].update();
            }
            break;
        }
        case GAMESCREENTYPE.GAME_TO_EDIT: {
            editMode = true;
            worldShift = 0;

            gameScreen = GAMESCREENTYPE.EDIT;
            break;
        }
        case GAMESCREENTYPE.EDIT: {
            editTimer += deltaTime;
            
            // air
            if (keys["Backspace"]) {
                removeGameObject();
            }
            // block
            if (keys["1"]) {
                placeGameObject(GAMEOBJECTTYPE.BLOCK);
            }
            // player
            if (keys["p"]) {
                placeGameObject(GAMEOBJECTTYPE.PLAYER);
            }
            // goal
            if (keys["g"]) {
                placeGameObject(GAMEOBJECTTYPE.GOAL);
            }
            // lava
            if (keys["2"]) {
                placeGameObject(GAMEOBJECTTYPE.LAVA);
            }
            // green block
            if (keys["3"]) {
                placeGameObject(GAMEOBJECTTYPE.GREENBLOCK);
            }
            // green switch
            if (keys["#"]) {
                placeGameObject(GAMEOBJECTTYPE.GREENSWITCH);
            }
            // blue block
            if (keys["4"]) {
                placeGameObject(GAMEOBJECTTYPE.BLUEBLOCK);
            }
            // blue switch
            if (keys["$"]) {
                placeGameObject(GAMEOBJECTTYPE.BLUESWITCH);
            }
            // red block
            if (keys["5"]) {
                placeGameObject(GAMEOBJECTTYPE.REDBLOCK);
            }
            // red switch
            if (keys["%"]) {
                placeGameObject(GAMEOBJECTTYPE.REDSWITCH);
            }
            // alter
            if (keys["6"]) {
                placeGameObject(GAMEOBJECTTYPE.ALTER);
            }
            // check for alter click
            for (var i = 0; i < eGameObjectList.length; i++) {
                if (eGameObjectList[i].type == GAMEOBJECTTYPE.ALTER && mouseDown && mouseX >= eGameObjectList[i].pos.x && mouseX <= (eGameObjectList[i].pos.x + gameObjectSize) && mouseY >= eGameObjectList[i].pos.y && mouseY <= (eGameObjectList[i].pos.y + gameObjectSize)) {
                    editingAlterID = i;
                    editingAlterShift = eGameObjectList[i].shift;
                    gameScreen = GAMESCREENTYPE.EDIT_TO_ALTER_SETTINGS;
                }
            }

            // edit world shift
            if (keys["Tab"] && editTimer > editDelay) {
                saveToEWorldList();

                editTimer = 0;
                gameScreen = GAMESCREENTYPE.EDIT_TO_SHIFT_SETTINGS;
            }

            // playtest
            if ((keys[" "] || keys["Enter"]) && editTimer > editDelay) {
                saveToEWorldList();

                editTimer = 0;
                gameScreen = GAMESCREENTYPE.EDIT_TO_GAME;
            }

            // generate code
            if (keys["c"] && !(keys["Meta"] || keys["Control"])) {
                codeOutputElement.innerHTML = generateCode();
                codeOutputDivElement.hidden = false;
                codeInputDivElement.hidden = true;
            }

            // read code
            if (keys["C"] && !(keys["Meta"] || keys["Control"])) {
                codeOutputDivElement.hidden = true;
                codeInputDivElement.hidden = false;
            }
            break;
        }
        case GAMESCREENTYPE.EDIT_TO_GAME: {
            deathAnimTimer = over9000;
            goalAnimTimer = over9000;

            listFromEList();
            worldFromEWorld();

            worldShift = 0;

            editMode = true;

            codeInputDivElement.hidden = true;
            codeOutputDivElement.hidden = true;

            gameScreen = GAMESCREENTYPE.GAME;
            break;
        }
        case GAMESCREENTYPE.EDIT_TO_ALTER_SETTINGS: {
            typeTimer = typeDelay;

            codeInputDivElement.hidden = true;
            codeOutputDivElement.hidden = true;

            gameScreen = GAMESCREENTYPE.ALTER_SETTINGS;
            break;
        }
        case GAMESCREENTYPE.ALTER_SETTINGS: {
            typeTimer += deltaTime;

            // type
            if (keys["0"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "0";
            }
            if (keys["1"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "1";
            }
            if (keys["2"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "2";
            }
            if (keys["3"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "3";
            }
            if (keys["4"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "4";
            }
            if (keys["5"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "5";
            }
            if (keys["6"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "6";
            }
            if (keys["7"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "7";
            }
            if (keys["8"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "8";
            }
            if (keys["9"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift += "9";
            }
            if (keys["Backspace"] && typeTimer > typeDelay) {
                typeTimer = 0;
                editingAlterShift = editingAlterShift.slice(0, -1);
            }

            // submit setting
            if (keys["Enter"]) {
                eGameObjectList[editingAlterID].shift = Number(editingAlterShift);
                editingAlterID = -1;
                editingAlterShift = 0;

                editTimer = 0;

                gameScreen = GAMESCREENTYPE.ALTER_SETTINGS_TO_EDIT;
            }
            break;
        }
        case GAMESCREENTYPE.ALTER_SETTINGS_TO_EDIT: {
            editMode = true;

            gameScreen = GAMESCREENTYPE.EDIT;
            break;
        }
        case GAMESCREENTYPE.EDIT_TO_SHIFT_SETTINGS: {
            typeTimer = typeDelay;
            worldShift = String(worldShift);

            codeInputDivElement.hidden = true;
            codeOutputDivElement.hidden = true;

            gameScreen = GAMESCREENTYPE.SHIFT_SETTINGS;
            break;
        }
        case GAMESCREENTYPE.SHIFT_SETTINGS: {
            typeTimer += deltaTime;

            // type
            if (keys["0"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "0";
            }
            if (keys["1"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "1";
            }
            if (keys["2"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "2";
            }
            if (keys["3"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "3";
            }
            if (keys["4"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "4";
            }
            if (keys["5"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "5";
            }
            if (keys["6"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "6";
            }
            if (keys["7"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "7";
            }
            if (keys["8"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "8";
            }
            if (keys["9"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift += "9";
            }
            if (keys["Backspace"] && typeTimer > typeDelay) {
                typeTimer = 0;
                worldShift = worldShift.slice(0, -1);
            }

            // submit setting
            if (keys["Enter"]) {
                worldShift = Number(worldShift);
                readFromEWorldList();

                editTimer = 0;

                gameScreen = GAMESCREENTYPE.SHIFT_SETTINGS_TO_EDIT;
            }
            break;
        }
        case GAMESCREENTYPE.SHIFT_SETTINGS_TO_EDIT: {
            gameScreen = GAMESCREENTYPE.EDIT;
            break;
        }
        default: {
            break;
        }
    }
}

function render() {
    switch (gameScreen) {
        case GAMESCREENTYPE.TITLE: {
            // background (white)
            ctx.beginPath();
            ctx.fillStyle = "#222222ff";
            ctx.fillRect(0, 0, 512, 512);

            // particles
            for (var i = 0; i < randomParticles.length; i++) {
                ctx.beginPath();
                ctx.fillStyle = "#ffffffff";
                ctx.fillRect(randomParticles[i][0].x, randomParticles[i][0].y, randomParticles[i][2], randomParticles[i][2]);
            }

            // title text
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "70px Comic Sans MS";
            ctx.fillText("Look Around", 50, 70);

            // play text
            ctx.beginPath();
            if (mouseX > 70 && mouseX < 150 && mouseY > 200 && mouseY < 250) {
                ctx.fillStyle = "#ff0000ff";
                if (mouseDown) {
                    gameScreen = GAMESCREENTYPE.TITLE_TO_GAME;
                }
            } else {
                ctx.fillStyle = "#ffffffff";
            }
            ctx.font = "40px Comic Sans MS";
            ctx.fillText("Play", 70, 240);

            // edit text
            ctx.beginPath();
            if (mouseX > 350 && mouseX < 430 && mouseY > 300 && mouseY < 350) {
                ctx.fillStyle = "#ff0000ff";
                if (mouseDown) {
                    gameScreen = GAMESCREENTYPE.TITLE_TO_EDIT;
                }
            } else {
                ctx.fillStyle = "#ffffffff";
            }
            ctx.font = "40px Comic Sans MS";
            ctx.fillText("Edit", 350, 340);

            // mouse light
            ctx.beginPath();
            ctx.fillStyle = "rgba("+(255 - Math.floor(deathAnimTimer * 10))+","+(255 - Math.floor(goalAnimTimer * 10))+",0,255)"
            ctx.rect(0, 0, 512, 512);
            ctx.arc(mouseX, mouseY, lightRadius, 0, 2*Math.PI, true);
            ctx.fill();
            break;
        }
        case GAMESCREENTYPE.GAME: {
            // background (white)
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.fillRect(0, 0, 512, 512);

            // rendering here
            for (var i = 0; i < gameObjectList.length; i++) {
                if (gameObjectList[i].type != GAMEOBJECTTYPE.PLAYER) {
                    gameObjectList[i].render();
                }
            }

            // render players in front
            for (var i = 0; i < gameObjectList.length; i++) {
                if (gameObjectList[i].type == GAMEOBJECTTYPE.PLAYER) {
                    gameObjectList[i].render();
                }
            }

            // mouse light
            ctx.beginPath();
            ctx.fillStyle = "rgba("+(255 - Math.floor(deathAnimTimer * 10))+","+(255 - Math.floor(goalAnimTimer * 10))+",0,255)"
            ctx.rect(0, 0, 512, 512);
            ctx.arc(mouseX, mouseY, lightRadius, 0, 2*Math.PI, true);
            ctx.fill();
            break;
        }
        case GAMESCREENTYPE.EDIT: {
            // background (white)
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.fillRect(0, 0, 512, 512);
            
            // rendering here
            for (var i = 0; i < eGameObjectList.length; i++) {
                eGameObjectList[i].render();
            }

            // darken selected tile
            ctx.beginPath();
            ctx.fillStyle = "#00000022";
            ctx.fillRect(gameObjectSize * Math.floor(mouseX / gameObjectSize), gameObjectSize * Math.floor(mouseY / gameObjectSize), gameObjectSize, gameObjectSize);

            // display shift
            ctx.beginPath();
            ctx.fillStyle = "#0000ffff";
            ctx.font = "15px Comic Sans MS";
            ctx.fillText(Number(worldShift), 3, 16);
            break;
        }
        case GAMESCREENTYPE.ALTER_SETTINGS: {
            // background (black)
            ctx.beginPath();
            ctx.fillStyle = "#000000ff";
            ctx.fillRect(0, 0, 512, 512);

            // text
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText("Shift (Alter):", 20, 40);

            // shift value
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText(Number(editingAlterShift), 20, 80);

            // submit text
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText("Enter to submit", 20, 500);
            break;
        }
        case GAMESCREENTYPE.SHIFT_SETTINGS: {
            // background (black)
            ctx.beginPath();
            ctx.fillStyle = "#000000ff";
            ctx.fillRect(0, 0, 512, 512);

            // text
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText("Shift (World):", 20, 40);

            // shift value
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText(Number(worldShift), 20, 80);

            // submit text
            ctx.beginPath();
            ctx.fillStyle = "#ffffffff";
            ctx.font = "30px Comic Sans MS";
            ctx.fillText("Enter to submit", 20, 500);
            break;
        }
        default: {
            break;
        }
    }
}

var deltaTime = 0;
var deltaCorrect = (1 / 8);
var prevTime = Date.now();
function loop() {
    deltaTime = (Date.now() - prevTime) * deltaCorrect;
    prevTime = Date.now();

    main();
    window.requestAnimationFrame(loop);
}

function init() {
    loadLevel(gameLevel);

    window.requestAnimationFrame(loop)
}
window.requestAnimationFrame(init);
