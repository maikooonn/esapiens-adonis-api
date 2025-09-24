import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: env.get('DB_CONNECTION', 'postgres'),
  connections: {
    postgres: {
      client: 'pg',
      connection: env.get('DATABASE_URL') || {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    sqlite: {
      client: 'sqlite3',
      connection: {
        filename: env.get('DB_DATABASE', 'tmp/test.sqlite3'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      useNullAsDefault: true,
    },
  },
})

export default dbConfig
