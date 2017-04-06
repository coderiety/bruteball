export const up = ({schema}) =>
  schema
    .raw('CREATE EXTENSION IF NOT EXISTS citext')
    .createTable('users', t => {
      t.uuid('id').primary();
      t.specificType('emailAddress', 'citext').unique().index();
      t.specificType('name', 'citext').unique().index();
      t.timestamp('signedInAt');
      t.timestamp('expiredTokensAt');
      t.timestamp('createdAt').defaultTo('now()');
    })

    .createTable('maps', t => {
      t.uuid('id').primary();
      t.string('name').notNullable().unique();
      t.timestamps();
    })

    .createTable('games', t => {
      t.uuid('id').primary();
      t.integer('mapId').notNullable().references('id').inTable('maps');
      t.string('name');
      t.string('email').notNullable().unique();
      t.timestamps();
    });

export const down = ({schema}) =>
  schema
    .dropTable('games')
    .dropTable('maps')
    .dropTable('users');
