import _ from 'underscore';
import average from 'shared/utils/average';
import Cursors from 'cursors';
import Game from 'shared/objects/game';
import GameComponent from 'client/components/game';
import React from 'react';

var KEYS = {
  '38': {down: false, x: 0, y: 1},
  '40': {down: false, x: 0, y: -1},
  '37': {down: false, x: -1, y: 0},
  '39': {down: false, x: 1, y: 0}
};

var PING_WAIT = 2000;
var PINGS_TO_HOLD = 10;

export default React.createClass({
  mixins: [Cursors],

  getInitialState: function () {
    return {
      fps: 0,
      pings: []
    };
  },

  componentDidMount: function () {
    this.ping();
    this.state.live.on({
      'new-game': this.handleNewGame,
      g: this.handleGame,
      'remove-user': this.removeUser
    });
    document.addEventListener('keydown', this.handleKey);
    document.addEventListener('keyup', this.handleKey);
  },

  componentWillUnmount: function () {
    this.state.live.off({
      'new-game': this.handleNewGame,
      g: this.handleGame,
      'remove-user': this.removeUser
    });
    document.removeEventListener('keydown', this.handleKey);
    document.removeEventListener('keyup', this.handleKey);
  },

  ping: function () {
    this.state.live.send('ping', Date.now(), this.handlePing);
    clearTimeout(this.pingTimeoutId);
    this.pingTimeoutId = _.delay(this.ping, PING_WAIT);
  },

  handlePing: function (er, then) {
    if (er) throw new Error('Ping failed!');
    this.update({pings: {$splice: [
      [0, 0, Date.now() - then],
      [PINGS_TO_HOLD, 1]
    ]}});
  },

  getPing: function () {
    return Math.ceil(average(this.state.pings));
  },

  handleKey: function (ev) {
    var key = KEYS[ev.which];
    var state = ev.type === 'keydown';
    if (!key || key.down === state) return;
    key.down = state;
    this.sendAv();
    ev.preventDefault();
  },

  sendAv: function () {
    this.state.live.send('set-av', this.getAv());
  },

  getAv: function () {
    return _.reduce(_.filter(KEYS, {down: true}), function (av, key) {
      return {x: av.x + key.x, y: av.y + key.y};
    }, {x: 0, y: 0});
  },

  handleNewGame: function (g) {
    if (this.game) Game.stop(this.game);
    this.game = Game.create();
    this.game.id = _.uniqueId();
    Game.applyFrame(this.game, g);
    Game.start(this.game);
    this.forceUpdate();
  },

  handleGame: function (g) {
    if (this.game) Game.addFrame(this.game, g);
  },

  removeUser: function (u) {
    Game.destroyObject(this.game, {type: 'user', id: u[0]});
  },

  renderGame: function () {
    if (!this.game) return;
    return (
      <GameComponent
        key={this.game.id}
        game={this.game}
        cursors={{
          user: this.getCursor('user'),
          fps: this.getCursor('fps')
        }}
      />
    );
  },

  render: function () {
    return (
      <div>
        <div className='stats'>
          <div>FPS: {this.state.fps}</div>
          <div>Ping: {this.getPing()}ms</div>
          <div>Jitter: {this.game ? Game.getStepBuffer(this.game) : null}</div>
          {this.game ? null : <div>Loading...</div>}
        </div>
        {this.renderGame()}
      </div>
    );
  }
});
