import { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'test_username',
    password: 'test_password',
    database: 'batch_db',
  },  
};

export default config;
