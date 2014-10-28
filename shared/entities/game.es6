import _ from 'underscore';
import b2 from 'box2d';
import Ball from 'shared/entities/ball';
import config from 'shared/config';
import Wall from 'shared/entities/wall';

var app = config.node ? require('index') : null;
var gamePattern = config.node ? require('patterns/games/show').default : null;
var THREE = config.node ? null : require('three');

var MAP_SIZE = 16;

var SPS = 1000 / config.game.stepsPerSecond;
var VI = config.game.velocityIterations;
var PI = config.game.positionIterations;
var BROADCAST_WAIT = 1000 / config.game.broadcastsPerSecond;

var broadcastAll = function (game) {
  game.lastBroadcast = Date.now();
  app.ws.server.broadcast('g', gamePattern(game));
};

var broadcastWaiting = function (game) {
  var now = Date.now();
  var waiting = _.filter(game.users, function (user) {
    var lastBroadcast = Math.max(game.lastBroadcast, user.lastBroadcast);
    if (user.needsBroadcast <= lastBroadcast) return;
    user.lastBroadcast = now;
    return true;
  });
  if (!waiting.length) return;
  app.ws.server.broadcast('g', gamePattern(game, {users: waiting}));
};

export var step = function (game) {
  clearTimeout(game.stepTimeoutId);
  game.stepTimeoutId = _.delay(_.partial(step, game), SPS);
  var now = Date.now();
  var delta = now - game.lastStep;
  game.lastStep = now;
  var dt = delta / 1000;
  _.each(game.users, Ball.preStep);
  game.world.Step(dt, VI, PI);
  if (!config.node) _.each(game.users, Ball.postStep);
  if (config.node) {
    game.needsBroadcast > game.lastBroadcast ?
    broadcastAll(game) :
    broadcastWaiting(game);
  }
};

var loopBroadcast = function (game) {
  game.needsBroadcast = Date.now();
  game.broadcastTimeoutId =
    _.delay(_.partial(loopBroadcast, game), BROADCAST_WAIT);
};

export var setAcceleration = function (game, user, x, y) {
  var ref = game.users[user.id];
  if (!ref || ref.acceleration.x === x && ref.acceleration.y === y) return;
  ref.acceleration.Set(x, y);
  ref.acceleration.Normalize();
  ref.needsBroadcast = Date.now();
};

export var addUser = function (game, user) {
  if (game.users[user.id]) return;
  var ball = Ball.create(game);
  var position = ball.body.GetPosition();
  position.Set(MAP_SIZE / 2, MAP_SIZE / 2);
  ball.body.SetTransform(position, ball.body.GetAngle());
  game.users[user.id] = {
    info: user,
    ball: ball,
    acceleration: new b2.b2Vec2(0, 0),
    lastBroadcast: 0,
    needsBroadcast: 0
  };
};

export var removeUser = function (game, user) {
  var ref = game.users[user.id];
  if (!ref) return;
  Ball.destroy(ref.ball, game);
  b2.destroy(ref.acceleration);
  delete game.users[user.id];
};

var handleCollision = function (game, a, b) {
};

export var create = function () {
  var game = {
    users: {},
    world: new b2.b2World(),
    scene: config.node ? null : new THREE.Scene(),
    walls: [],
    lastStep: Date.now(),
    lastBroadcast: 0
  };
  game.walls.push(
    Wall.create({game: game, x: 0, y: 0, points: [
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: 1, y: MAP_SIZE},
      {x: 0, y: MAP_SIZE}
    ]}),
    Wall.create({game: game, x: MAP_SIZE - 1, y: 0, points: [
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: 1, y: MAP_SIZE},
      {x: 0, y: MAP_SIZE}
    ]}),
    Wall.create({game: game, x: 1, y: 0, points: [
      {x: 0, y: 0},
      {x: MAP_SIZE - 2, y: 0},
      {x: MAP_SIZE - 2, y: 1},
      {x: 0, y: 1}
    ]}),
    Wall.create({game: game, x: 1, y: MAP_SIZE - 1, points: [
      {x: 0, y: 0},
      {x: MAP_SIZE - 2, y: 0},
      {x: MAP_SIZE - 2, y: 1},
      {x: 0, y: 1}
    ]}),
    Wall.create({game: game, x: 4, y: 6, points: Wall.WITHOUT_TOP_RIGHT}),
    Wall.create({game: game, x: 5, y: 6}),
    Wall.create({game: game, x: 4, y: 5, points: Wall.WITHOUT_BOTTOM_LEFT}),
    Wall.create({game: game, x: 6, y: 6, points: Wall.WITHOUT_TOP_LEFT}),
    Wall.create({game: game, x: 6, y: 5, points: Wall.WITHOUT_BOTTOM_RIGHT}),
    Wall.create({game: game, x: 4, y: 3, points: Wall.WITHOUT_BOTTOM_RIGHT}),
    Wall.create({game: game, x: 4, y: 4, points: Wall.WITHOUT_TOP_LEFT}),
    Wall.create({game: game, x: 6, y: 4, points: Wall.WITHOUT_TOP_RIGHT}),
    Wall.create({game: game, x: 6, y: 3, points: Wall.WITHOUT_BOTTOM_LEFT})
  );

  var listener = new b2.JSContactListener();
  listener.BeginContact = function (contactPtr) {
    var contact = b2.wrapPointer(contactPtr, b2.b2Contact);
    var objA = _.find(game.objects, {body: contact.GetFixtureA().GetBody()});
    var objB = _.find(game.objects, {body: contact.GetFixtureB().GetBody()});
    handleCollision(game, objA, objB);
  };
  listener.EndContact = listener.PreSolve = listener.PostSolve = _.noop;
  game.world.SetContactListener(listener);

  return game;
};

export var start = function (game) {
  loopBroadcast(game);
  step(game);
};

export var stop = function (game) {
  clearTimeout(game.broadcastTimeoutId);
  clearTimeout(game.stepTimeoutId);
};
