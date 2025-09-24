import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Post from './post.js'

export default class Comment extends BaseModel {
  static table = 'comments'

  @column({ isPrimary: true, columnName: 'comment_id' })
  declare commentId: number

  @column({ columnName: 'post_id' })
  declare postId: number

  @column({ columnName: 'author_id' })
  declare authorId: number

  @column()
  declare text: string

  @column({ columnName: 'parent_id' })
  declare parentId: number | null

  @column()
  declare status: string

  @column()
  declare deleted: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'authorId'
  })
  declare author: BelongsTo<typeof User>

  @belongsTo(() => Post, {
    foreignKey: 'postId'
  })
  declare post: BelongsTo<typeof Post>

  @belongsTo(() => Comment, {
    foreignKey: 'parentId'
  })
  declare parent: BelongsTo<typeof Comment>

  @hasMany(() => Comment, {
    foreignKey: 'parentId'
  })
  declare replies: HasMany<typeof Comment>
}