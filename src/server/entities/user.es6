import crypto from 'crypto';

var KEY_DELIM = '-';

var DEFAULT_MD5 = 'e916863a6d94694aee15adb363333feb';

var GRAVATAR = function (md5) {
  return 'http://www.gravatar.com/avatar/' + md5 + '.png';
};

var DEFAULT_AVATAR_URL = GRAVATAR(DEFAULT_MD5);

export var getKey = function (user) {
  return user.id + KEY_DELIM + user.rand;
};

export var getIdFromKey = function (key) {
  return parseInt(key.split(KEY_DELIM)[0]);
};

export var getRandFromKey = function (key) {
  return key.split(KEY_DELIM)[1];
};

export var createRand = function () {
  return crypto.randomBytes(32).toString('hex');
};

export var getName = function (user) {
  return user.name ? user.name : 'Bruteball ' + user.id;
};

export var getAvatarUrl = function (user) {
  if (!user.email) return DEFAULT_AVATAR_URL;
  var hash = crypto.createHash('md5');
  hash.update(user.email);
  return GRAVATAR(hash.digest('hex'));
};