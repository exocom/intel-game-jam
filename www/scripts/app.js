// # Quintus platformer example
//
// [Run the example](../quintus/examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player.
window.addEventListener("load", function () {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
  var Q = window.Q = Quintus({audioSupported: ['wav', 'mp3', 'ogg']})
    .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX")
    // Maximize this game to whatever the size of the browser is
    .setup({maximize: true})
    // And turn on default input controls and touch input (for UI)
    .controls(true).touch()
  // Enable sounds.
  //.enableSound();

// Load and init audio files.


  Q.SPRITE_PLAYER = 1;
  Q.SPRITE_BUSTER = 0;
  Q.SPRITE_COLLECTABLE = 3;
  Q.SPRITE_ENEMY = 4;
  Q.SPRITE_DOOR = 8;

  Q.Sprite.extend("Player", {

    init: function (p) {

      this._super(p, {
        sheet: "player",  // Setting a sprite sheet sets sprite width and height
        sprite: "player",
        direction: "right",
        jumpSpeed: -425,
        speed: 300,
        strength: 100,
        score: 0,
        type: Q.SPRITE_PLAYER,
        collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE,
        busterSpeed: 300
      });

      this.p.points = [
        [-20, -20],
        [20, -20],
        [15, 20],
        [-15, 20]
      ];

      this.add('2d, platformerControls, animation, tween');

      this.on("bump.top", "breakTile");

      this.on("sensor.tile", "checkLadder");
      this.on("enemy.hit", "enemyHit");
      this.on("jump");
      this.on("jumped");

      Q.input.on("down", this, "checkDoor");
      Q.input.on("fire", this, "fire");
    },

    jump: function (obj) {
      // Only play sound once.
      if (!obj.p.playedJump) {
        //Q.audio.play('jump.mp3');
        obj.p.playedJump = true;
      }
    },

    jumped: function (obj) {
      obj.p.playedJump = false;
      obj.p.playedJumpAnimation = false;
    },

    checkLadder: function (colObj) {
      if (colObj.p.ladder) {
        this.p.onLadder = true;
        this.p.ladderX = colObj.p.x;
      }
    },

    checkDoor: function () {
      this.p.checkDoor = true;
    },

    resetLevel: function () {
      Q.stageScene("level1");
      this.p.strength = 100;
      this.animate({opacity: 1});
      Q.stageScene('hud', 3, this.p);
    },

    enemyHit: function (data) {
      var col = data.col;
      var enemy = data.enemy;
      this.p.vy = -150;
      if (col.normalX == 1) {
        // Hit from left.
        this.p.x -= 15;
        this.p.y -= 15;
      }
      else {
        // Hit from right;
        this.p.x += 15;
        this.p.y -= 15;
      }
      this.p.immune = true;
      this.p.immuneTimer = 0;
      this.p.immuneOpacity = 1;
      this.p.strength -= 25;
      Q.stageScene('hud', 3, this.p);
      if (this.p.strength == 0) {
        this.resetLevel();
      }
    },

    continueOverSensor: function () {
      this.p.vy = 0;
      if (this.p.vx != 0) {
        this.play("walk_" + this.p.direction);
      } else {
        this.play("stand_" + this.p.direction);
      }
    },

    breakTile: function (col) {
      if (col.obj.isA("TileLayer")) {
        if (col.tile == 24) {
          col.obj.setTile(col.tileX, col.tileY, 36);
        }
        else if (col.tile == 36) {
          col.obj.setTile(col.tileX, col.tileY, 24);
        }
      }
      //Q.audio.play('coin.mp3');
    },

    fire: function () {
      var p = this.p;
      var xos = 34;
      var yos = 1;
      var vx = p.busterSpeed;

      if (this.p.direction === "left") {
        xos = (-xos) + 40;
        vx = -vx;
      }

      this.play("fire_" + this.p.direction);

      this.stage.insert(
        new Q.Buster({
          x: this.c.points[0][0] + xos,
          y: this.c.points[0][1] + yos,
          vx: vx,
          vy: 0
        })
      );
    },

    step: function (dt) {
      var processed = false;
      if (this.p.immune) {
        // Swing the sprite opacity between 50 and 100% percent when immune.
        if ((this.p.immuneTimer % 12) == 0) {
          var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
          this.animate({"opacity": opacity}, 0);
          this.p.immuneOpacity = opacity;
        }
        this.p.immuneTimer++;
        if (this.p.immuneTimer > 144) {
          // 3 seconds expired, remove immunity.
          this.p.immune = false;
          this.animate({"opacity": 1}, 1);
        }
      }

      if (this.p.onLadder) {
        this.p.gravity = 0;

        if (Q.inputs['up']) {
          this.p.vy = -this.p.speed;
          this.p.x = this.p.ladderX;
          this.play("climb");
        } else if (Q.inputs['down']) {
          this.p.vy = this.p.speed;
          this.p.x = this.p.ladderX;
          this.play("climb");
        } else {
          this.continueOverSensor();
        }
        processed = true;
      }

      if (!processed && this.p.door) {
        this.p.gravity = 1;
        if (this.p.checkDoor && this.p.landed > 0) {
          // Enter door.
          this.p.y = this.p.door.p.y;
          this.p.x = this.p.door.p.x;
          this.play('climb');
          this.p.toDoor = this.p.door.findLinkedDoor();
          processed = true;
        }
        else if (this.p.toDoor) {
          // Transport to matching door.
          this.p.y = this.p.toDoor.p.y;
          this.p.x = this.p.toDoor.p.x;
          this.stage.centerOn(this.p.x, this.p.y);
          this.p.toDoor = false;
          this.stage.follow(this);
          processed = true;
        }
      }
      if (!processed) {

        this.p.gravity = 1;

        if (Q.inputs['down'] && !this.p.door) {
          this.p.ignoreControls = true;
          this.play("duck_" + this.p.direction);
          if (this.p.landed > 0) {
            this.p.vx = this.p.vx * (1 - dt * 2);
          }
          //this.p.points = this.p.duckingPoints;
        } else if (Q.inputs['fire']) {
          this.play("fire_" + this.p.direction);
        } else {
          this.p.ignoreControls = false;
          //this.p.points = this.p.standingPoints;

          if (this.p.vx > 0) {
            if (this.p.landed > 0) {
              this.play("walk_right");
              this.p.playedJumpAnimation = false;
            } else {
              if (!this.p.playedJumpAnimation) {
                this.p.playedJumpAnimation = true;
                this.play("jump_right");
              }
            }
            this.p.direction = "right";
          } else if (this.p.vx < 0) {
            if (this.p.landed > 0) {
              this.play("walk_left");
            } else {
              if (!this.p.playedJumpAnimation) {
                this.p.playedJumpAnimation = true;
                this.play("jump_left");
              }
            }
            this.p.direction = "left";
          } else {
            this.play("stand_" + this.p.direction);
            this.p.playedJumpAnimation = false;
          }

        }
      }

      this.p.onLadder = false;
      this.p.door = false;
      this.p.checkDoor = false;


      if (this.p.y > 1000) {
        this.stage.unfollow();
      }

      if (this.p.y > 2000) {
        this.resetLevel();
      }
    }
  });

  Q.Sprite.extend("Buster", {
    init: function (p) {

      this._super(p, {
        sheet: "buster",  // Setting a sprite sheet sets sprite width and height
        sprite: "buster",
        w: 10,
        h: 10,
        gravity: 0,
        type: Q.SPRITE_BUSTER,
        collisionMask: Q.SPRITE_ENEMY
      });

      this.add("2d, animation");
      this.on("hit.sprite", this, "collision");

    },

    collision: function (col) {
      this.destroy();
    },

    enemyHit: function () {
      this.destroy();
    },

    step: function (dt) {
      if (!Q.overlap(this, this.stage)) {
        this.destroy();
      }
      var p = this.p;

      p.vx += p.ax * dt;
      p.vy += p.ay * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      this.play("fire");
    }
  });


  Q.Sprite.extend("Enemy", {
    init: function (p, defaults) {

      this._super(p, Q._defaults(defaults || {}, {
        sheet: p.sprite,
        vx: 50,
        defaultDirection: 'left',
        type: Q.SPRITE_ENEMY,
        collisionMask: Q.SPRITE_DEFAULT
      }));

      this.add("2d, aiBounce, animation");
      this.on("bump.top", this, "die");
      this.on("hit.sprite", this, "hit");
    },

    step: function (dt) {
      if (this.p.dead) {
        this.del('2d, aiBounce');
        this.p.deadTimer++;
        if (this.p.deadTimer > 24) {
          // Dead for 24 frames, remove it.
          this.destroy();
        }
        return;
      }
      var p = this.p;

      p.vx += p.ax * dt;
      p.vy += p.ay * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      this.play('walk');
    },

    hit: function (col) {
      if (col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
        col.obj.trigger('enemy.hit', {"enemy": this, "col": col});
        //Q.audio.play('hit.mp3');
      }
      if (col.obj.isA("Buster")) {
        col.obj.trigger('enemy.hit', {"enemy": this, "col": col});
        this.die(col);
      }
    },

    die: function (col) {
      if (col.obj.isA("Player") || col.obj.isA("Buster")) {
        //Q.audio.play('coin.mp3');
        this.p.vx = this.p.vy = 0;
        this.play('dead');
        this.p.dead = true;
        var that = this;
        col.obj.p.vy = -300;
        this.p.deadTimer = 0;
      }
    }
  });

  Q.Enemy.extend("Fly", {});

  Q.Enemy.extend("Slime", {
    init: function (p) {
      this._super(p, {
        w: 55,
        h: 34
      });
    }
  });

  Q.Enemy.extend("Snail", {
    init: function (p) {
      this._super(p, {
        w: 55,
        h: 36
      });
    }

  });

  Q.Sprite.extend("Collectable", {
    init: function (p) {
      this._super(p, {
        sheet: p.sprite,
        type: Q.SPRITE_COLLECTABLE,
        collisionMask: Q.SPRITE_PLAYER,
        sensor: true,
        vx: 0,
        vy: 0,
        gravity: 0
      });
      this.add("animation");

      this.on("sensor");
    },

    // When a Collectable is hit.
    sensor: function (colObj) {
      // Increment the score.
      if (this.p.amount) {
        colObj.p.score += this.p.amount;
        Q.stageScene('hud', 3, colObj.p);
      }
      //Q.audio.play('coin.mp3');
      this.destroy();
    }
  });

  Q.Sprite.extend("Door", {
    init: function (p) {
      this._super(p, {
        sheet: p.sprite,
        type: Q.SPRITE_DOOR,
        collisionMask: Q.SPRITE_NONE,
        sensor: true,
        vx: 0,
        vy: 0,
        gravity: 0
      });
      this.add("animation");

      this.on("sensor");
    },
    findLinkedDoor: function () {
      return this.stage.find(this.p.link);
    },
    // When the player is in the door.
    sensor: function (colObj) {
      // Mark the door object on the player.
      colObj.p.door = this;
    }
  });

  Q.Collectable.extend("Heart", {
    // When a Heart is hit.
    sensor: function (colObj) {
      // Increment the strength.
      if (this.p.amount) {
        colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
        Q.stageScene('hud', 3, colObj.p);
        //Q.audio.play('heart.mp3');
      }
      this.destroy();
    }
  });

  Q.scene("level1", function (stage) {
    Q.stageTMX("level1.tmx", stage);

    stage.add("viewport").follow(Q("Player").first());
    stage.viewport.scale = 4;
  });

  Q.scene('hud', function (stage) {
    var container = stage.insert(new Q.UI.Container({
      x: 50, y: 0
    }));

    var label = container.insert(new Q.UI.Text({
      x: 200, y: 20,
      label: "Score: " + stage.options.score, color: "white"
    }));

    var strength = container.insert(new Q.UI.Text({
      x: 50, y: 20,
      label: "Health: " + stage.options.strength + '%', color: "white"
    }));

    container.fit(20);
  });

  Q.loadTMX("level1.tmx, collectables.json, doors.json, enemies.json, fire.mp3, jump.mp3, heart.mp3, hit.mp3, coin.mp3, player.json, player.png, buster.json, buster.png", function () {
    Q.compileSheets("player.png", "player.json");
    Q.compileSheets("buster.png", "buster.json");
    Q.compileSheets("collectables.png", "collectables.json");
    Q.compileSheets("enemies.png", "enemies.json");
    Q.compileSheets("doors.png", "doors.json");
    Q.animations("player", {
      walk_right: {frames: [0, 1, 2, 3, 4, 5, 6, 7], rate: 1 / 15, flip: false, loop: true},
      walk_left: {frames: [0, 1, 2, 3, 4, 5, 6, 7], rate: 1 / 15, flip: "x", loop: true},
      jump_right: {frames: [13, 14, 15, 16, 17, 18], rate: 1 / 8, flip: false, loop: false},
      jump_left: {frames: [13, 14, 15, 16, 17, 18], rate: 1 / 8, flip: "x", loop: false},
      stand_right: {frames: [19], rate: 1 / 10, flip: false},
      stand_left: {frames: [19], rate: 1 / 10, flip: "x"},
      duck_right: {frames: [1], rate: 1 / 10, flip: false},
      duck_left: {frames: [1], rate: 1 / 10, flip: "x"},
      climb: {frames: [20, 21, 22, 23], rate: 1 / 3, flip: false},
      fire_right: {frames: [11,12], rate: 1 / 3, flip: false},
      fire_left: {frames: [11,12], rate: 1 / 3, flip: "x"}
    });

    Q.animations("buster", {
      fire: {frames: [0,1,2,3,4,4,2,3,4,4], rate: 1 / 7, flip: false, loop: true}
    });

    var EnemyAnimations = {
      walk: {frames: [0, 1], rate: 1 / 3, loop: true},
      dead: {frames: [2], rate: 1 / 10}
    };
    Q.animations("fly", EnemyAnimations);
    Q.animations("slime", EnemyAnimations);
    Q.animations("snail", EnemyAnimations);
    Q.stageScene("level1");
    Q.stageScene('hud', 3, Q('Player').first().p);

  }, {
    progressCallback: function (loaded, total) {
      var element = document.getElementById("loading_progress");
      element.style.width = Math.floor(loaded / total * 100) + "%";
      if (loaded == total) {
        document.getElementById("loading").remove();
      }
    }
  });

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level.json to change the level around and add in some more enemies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});
