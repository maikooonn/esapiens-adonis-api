import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('comment_id')
      table.integer('post_id').unsigned().notNullable()
      table.integer('author_id').unsigned().notNullable()
      table.string('text', 1024).notNullable()
      table.integer('parent_id').unsigned().nullable()
      table.string('status', 20).defaultTo('pending')
      table.boolean('deleted').defaultTo(false)

      table.foreign('author_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('post_id').references('id').inTable('posts').onDelete('CASCADE')
      table.foreign('parent_id').references('comment_id').inTable('comments').onDelete('CASCADE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
