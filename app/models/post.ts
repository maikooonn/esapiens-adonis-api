import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Comment from './comment.js'

export default class Post extends BaseModel {
  static table = 'posts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare content: string

  @column({ columnName: 'author_id' })
  declare authorId: number

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'authorId'
  })
  declare author: BelongsTo<typeof User>

  @hasMany(() => Comment, {
    foreignKey: 'postId'
  })
  declare comments: HasMany<typeof Comment>
}