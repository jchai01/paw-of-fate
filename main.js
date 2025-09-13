const speed = 0.3;
const enemySpeed = 0.1;

const G = {
  width: 320,
  height: 480,
  tileSize: 16,
  tiles: ["tiles.png"],
};

// where is the cat facing
const Direction = {
  N: 0,
  E: 1,
  S: 2,
  W: 3,
  NE: 4,
  SE: 5,
  SW: 6,
  NW: 7,
};

let catDirection = Direction.N;

let score = 0;
let catAlive = true;
let cat;
let enemy;
let slash;
let slashDuration = 0.1;
let timeTillNextStage = 10;

let slashRate = 10;
let nextSlashIn = 0;

let spawnInterval = 130;
let maxSpawnInterval = 30;
let nextSpawnIn = 0;
let spawnRadius = 20; // for spawner

let radius = 10; // for particle

class Cat extends EngineObject {
  constructor() {
    super(vec2(0, 0), vec2(0.7, 1), tile(0, G.tileSize));

    this.setCollision();
  }
}

class Enemy extends EngineObject {
  constructor(pos, size) {
    super(pos, size, tile(1, G.tileSize));

    this.setCollision();
  }

  update() {
    engineObjectsCallback(this.pos, this.size, (o) => {
      if (o == slash) {
        this.destroy();
        ++score;

        new ParticleEmitter(
          this.pos,
          0, // pos, angle
          this.radius / 4,
          0.1,
          70 * radius,
          PI, // emitSize, emitTime, emitRate, emitCone
          0, // tileInfo
          rgb(1, 0.5, 0.1),
          rgb(1, 0.1, 0.1), // colorStartA, colorStartB
          rgb(1, 0.5, 0.1, 0),
          rgb(1, 0.1, 0.1, 0), // colorEndA, colorEndB
          0.7,
          0.8,
          0.2,
          0.2,
          0.05, // time, sizeStart, sizeEnd, speed, angleSpeed
          0.9,
          1,
          -0.2,
          PI,
          0.05, // damp, angleDamp, gravity, particleCone, fade
          0.5,
          0,
          1,
          0,
          1e9, // randomness, collide, additive, colorLinear, renderOrder
        );
      }
      if (o == cat) {
        catAlive = false;
      }
    });
    super.update();

    if (!catAlive) {
      this.destroy();
    }

    let direction = vec2(cat.pos.x - this.pos.x, cat.pos.y - this.pos.y);
    this.pos.x += direction.normalize().x * enemySpeed;
    this.pos.y += direction.normalize().y * enemySpeed;
  }
}

class Slash extends EngineObject {
  constructor(pos, size, rotation) {
    super(pos, size, tile(2, G.tileSize));

    this.setCollision();
    this.angle = rotation;
  }

  update() {
    super.update();

    if (this.getAliveTime() > slashDuration) {
      this.destroy();
    }
  }
}

function gameInit() {
  // called once after the engine starts up
  // setup the game

  canvasFixedSize = vec2(1280, 720);

  // convert game dimensions to tile size
  G.size = vec2(G.width / G.tileSize, G.height / G.tileSize);

  cat = new Cat();
  cat.timer = new Timer();
  cat.timer.set(5);
}

function gameUpdate() {
  // called every frame at 60 frames per second
  // handle input and update the game state

  if (cat.timer.get() > 0 && spawnInterval > maxSpawnInterval) {
    cat.timer.set(timeTillNextStage);
    spawnInterval -= 10;
  }

  if (catAlive) {
    // keyDirection() does not work when buliding for js13k
    // opened issue: https://github.com/KilledByAPixel/LittleJS/issues/152
    // let movementVector = vec2(keyDirection().x, keyDirection().y);

    // workaround without keyDirection();
    let movementVector = vec2(0, 0);
    if (keyIsDown("ArrowUp")) {
      movementVector.y = 1;
    }
    if (keyIsDown("ArrowDown")) {
      movementVector.y = -1;
    }
    if (keyIsDown("ArrowLeft")) {
      movementVector.x = -1;
    }
    if (keyIsDown("ArrowRight")) {
      movementVector.x = 1;
    }

    // avoid normalizing vec2(0,0)
    // https://github.com/KilledByAPixel/LittleJS/issues/34
    if (movementVector.x != 0 || movementVector.y != 0) {
      // not sure why collision detection does not work when manipulating position directly
      // this.pos.y += movementVector.normalize().y * speed;
      // this.pos.x += movementVector.normalize().x * speed;

      cat.velocity.y = movementVector.normalize().y * speed;
      cat.velocity.x = movementVector.normalize().x * speed;
    } else {
      // if no key is pressed, stop the player
      cat.velocity = vec2(0, 0);
    }

    //diagonals
    if (movementVector.x == 1 && movementVector.y == 1) {
      catDirection = Direction.NE;
      cat.angle = (45 * Math.PI) / 180;
    }
    if (movementVector.x == -1 && movementVector.y == 1) {
      catDirection = Direction.NW;
      cat.angle = (-45 * Math.PI) / 180;
    }
    if (movementVector.x == 1 && movementVector.y == -1) {
      catDirection = Direction.SE;
      cat.angle = (135 * Math.PI) / 180;
    }
    if (movementVector.x == -1 && movementVector.y == -1) {
      catDirection = Direction.SW;
      cat.angle = (-135 * Math.PI) / 180;
    }

    // up down left right
    if (movementVector.x == -1 && movementVector.y == 0) {
      catDirection = Direction.W;
      cat.angle = (-90 * Math.PI) / 180;
    }
    if (movementVector.x == 1 && movementVector.y == 0) {
      catDirection = Direction.E;
      cat.angle = (90 * Math.PI) / 180;
    }
    if (movementVector.x == 0 && movementVector.y == 1) {
      catDirection = Direction.N;
      cat.angle = 0;
    }
    if (movementVector.x == 0 && movementVector.y == -1) {
      catDirection = Direction.S;
      cat.angle = (-180 * Math.PI) / 180;
    }

    if (keyIsDown("Space")) {
      if (nextSlashIn === 0) {
        let slashDirection = vec2(cat.pos.x, cat.pos.y + 1); // default North
        let slashRotation = 0;

        switch (catDirection) {
          case Direction.S:
            slashDirection = vec2(cat.pos.x, cat.pos.y - 1);
            slashRotation = (90 * Math.PI) / 180;
            break;
          case Direction.E:
            slashDirection = vec2(cat.pos.x + 1, cat.pos.y);
            break;
          case Direction.W:
            slashDirection = vec2(cat.pos.x - 1, cat.pos.y);
            break;
          case Direction.NE:
            slashDirection = vec2(cat.pos.x + 1, cat.pos.y + 1);
            slashRotation = (135 * Math.PI) / 180;
            break;
          case Direction.NW:
            slashDirection = vec2(cat.pos.x - 1, cat.pos.y + 1);
            slashRotation = (-135 * Math.PI) / 180;
            break;
          case Direction.SE:
            slashDirection = vec2(cat.pos.x + 1, cat.pos.y - 1);
            slashRotation = (-135 * Math.PI) / 180;
            break;
          case Direction.SW:
            slashDirection = vec2(cat.pos.x - 1, cat.pos.y - 1);
            slashRotation = (135 * Math.PI) / 180;
            break;
          default:
            slashDirection = vec2(cat.pos.x, cat.pos.y + 1);
            slashRotation = (90 * Math.PI) / 180;
            break;
        }
        slash = new Slash(slashDirection, vec2(0.8, 1.6), slashRotation);
        nextSlashIn = slashRate; // reset timer
      }
    }
    if (nextSlashIn > 0) {
      nextSlashIn -= 1;
    }

    // used spawn technique from this video: https://www.youtube.com/watch?v=XOs2qynEmNE
    let spawnVec = vec2(cat.pos.x + spawnRadius, cat.pos.y + spawnRadius); // spawn vector
    let a = Math.floor(Math.random() * 360);
    let b = rotateVector([spawnVec.x, spawnVec.y], a);
    let updatedSpawnVec = vec2(b[0], b[1]);

    if (nextSpawnIn === 0) {
      new Enemy(updatedSpawnVec), vec2(1, 1);
      nextSpawnIn = spawnInterval;
    } else {
      nextSpawnIn--;
    }
  }

  if (!catAlive) {
    cat.pos = vec2(0, 0);
    cat.timer.unset();

    if (keyIsDown("KeyR")) {
      score = 0;
      catAlive = true;
      cat.timer.set(timeTillNextStage);
    }
  }

  // background of the game
  drawRect(cameraPos, vec2(100), new Color(0.5, 0.5, 0.5));
}

function gameUpdatePost() {
  // called after physics and objects are updated
  // setup camera and prepare for render
}

function gameRender() {
  // called before objects are rendered
  // draw any background effects that appear behind objects
}

function gameRenderPost() {
  // called after objects are rendered
  // draw effects or hud that appear above all objects
  drawTextScreen("Score " + score, vec2(mainCanvasSize.x / 2, 70), 50);
  if (!catAlive) {
    drawTextScreen(
      "Game Over!",
      vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2),
      50,
    );
    drawTextScreen(
      " Press R to restart",
      vec2(mainCanvasSize.x / 2, mainCanvasSize.y / 2 + 70),
      50,
    );
  }
}

var rotateVector = function (vec, ang) {
  ang = -ang * (Math.PI / 180);
  var cos = Math.cos(ang);
  var sin = Math.sin(ang);
  return new Array(
    Math.round(10000 * (vec[0] * cos - vec[1] * sin)) / 10000,
    Math.round(10000 * (vec[0] * sin + vec[1] * cos)) / 10000,
  );
};

// Startup LittleJS Engine
engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
  G.tiles,
);
