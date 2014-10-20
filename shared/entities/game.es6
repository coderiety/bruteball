var node = typeof window === 'undefined';

import _ from 'underscore';
import config from 'shared/config';
import b2 from 'box2d';
import Ball from 'shared/entities/ball';

var app = node ? require('index') : null;
var userPattern = node ? require('patterns/games/users/show').default : null;
var gamePattern = node ? require('patterns/games/show').default : null;

var MAP_SIZE = 16;

var ACCELERATION = config.game.acceleration;
var SPS = 1000 / config.game.stepsPerSecond;
var VI = config.game.velocityIterations;
var PI = config.game.positionIterations;
var BROADCAST_WAIT = 1000 / config.game.broadcastsPerSecond;

var applyForce = function (user) {
  var force = new b2.b2Vec2(
    user.acceleration.get_x() * ACCELERATION,
    user.acceleration.get_y() * ACCELERATION
  );
  user.ball.body.ApplyLinearImpulse(force);
  b2.destroy(force);
};

var broadcastGame = function (game) {
  app.ws.server.broadcast('g', gamePattern(game));
  game.lastBroadcast = Date.now();
};

var broadcastUser = function (game, user) {
  var lastBroadcast = Math.max(game.lastBroadcast, user.lastBroadcast);
  if (user.needsBroadcast <= lastBroadcast) return;
  app.ws.server.broadcast('u', userPattern(user));
  user.lastBroadcast = Date.now();
};

export var step = function (game) {
  var now = Date.now();
  var dt = (now - game.lastStep) / 1000;
  if (!dt) return;
  _.each(game.users, applyForce);
  game.world.Step(dt, VI, PI);
  if (!config.node) {
    _.each(_.map(game.users, 'ball'), _.partial(Ball.updateMesh, _, dt));
  }
  game.lastStep = now;
  clearTimeout(game.stepTimeoutId);
  game.stepTimeoutId = setTimeout(_.partial(step, game), SPS);
  if (node) {
    if (game.needsBroadcast > game.lastBroadcast) broadcastGame(game);
    else _.each(game.users, _.partial(broadcastUser, game));
  }
};

var loopBroadcast = function (game) {
  game.needsBroadcast = Date.now();
  setTimeout(_.partial(loopBroadcast, game), BROADCAST_WAIT);
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
  var ball = Ball.create(game.world);
  var position = ball.body.GetPosition();
  position.Set(MAP_SIZE / 2, MAP_SIZE / 2);
  ball.body.SetTransform(position, ball.body.GetAngle());
  game.users[user.id] = {
    info: user,
    ball: ball,
    acceleration: new b2.b2Vec2(),
    lastBroadcast: 0
  };
};

export var removeUser = function (game, user) {
  var ref = game.users[user.id];
  if (!ref) return;
  game.world.DestroyBody(ref.ball);
  b2.destroy(ref.acceleration);
  delete game.users[user.id];
};

export var create = function () {
  var game = {
    users: {},
    world: new b2.b2World(),
    lastStep: Date.now(),
    lastBroadcast: 0
  };
  var bodyDef = new b2.b2BodyDef();
  var body = game.world.CreateBody(bodyDef);
  b2.destroy(bodyDef);
  var fixtureDef = new b2.b2FixtureDef();
  fixtureDef.set_restitution(0.25);
  var shape = b2.CreateLoopShape([
    {x: 0, y: 0},
    {x: MAP_SIZE, y: 0},
    {x: MAP_SIZE, y: MAP_SIZE},
    {x: 0, y: MAP_SIZE}
  ]);
  fixtureDef.set_shape(shape);
  body.CreateFixture(fixtureDef);
  b2.destroy(fixtureDef);
  b2.destroy(shape);
  loopBroadcast(game);
  step(game);
  return game;
};
