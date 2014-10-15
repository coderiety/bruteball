var node = typeof window === 'undefined';

var ENV_VARS = node ? process.env : {};

export default {
  env: ENV_VARS.NODE_ENV || 'development',
  port: ENV_VARS.PORT || 3000,
  url: ENV_VARS.URL || 'http://www.bruteball.com',
  cipherAlgorithm: 'aes256',

  store: {
    prefix: 'app:'
  },

  aws: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY
  },

  game: {
    sps: 30,
    velocityDamping: 0.5
  },

  knex: {
    client: 'postgresql',
    connection: ENV_VARS.DATABASE_URL ||
      'postgres://localhost/bruteball_development',

    pool: {
      min: 2,
      max: 10
    },

    migrations: {
      tableName: 'migrations'
    }
  }
};
