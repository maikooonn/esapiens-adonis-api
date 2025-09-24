import type { HttpContext } from '@adonisjs/core/http'
import Comment from '../models/comment.js'
import vine from '@vinejs/vine'

const updateCommentValidator = vine.compile(
  vine.object({
    text: vine.string().minLength(3).maxLength(1024),
  })
)

const approvalValidator = vine.compile(
  vine.object({
    status: vine.enum(['approved', 'rejected']),
  })
)

export default class CommentsController {
  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commentId = Number.parseInt(params.commentId)

      if (Number.isNaN(commentId)) {
        return response.badRequest({ error: 'Invalid comment ID' })
      }

      const comment = await Comment.find(commentId)
      if (!comment || comment.deleted) {
        return response.notFound({ error: 'Comment not found' })
      }

      if (comment.authorId !== user.id) {
        return response.forbidden({
          error: 'Only the comment author can edit this comment',
        })
      }

      if (comment.status === 'approved') {
        return response.badRequest({
          error: 'Cannot edit approved comments',
        })
      }

      const { text } = await request.validateUsing(updateCommentValidator)

      comment.text = text
      comment.status = 'pending'
      await comment.save()

      await comment.load('author', (query) => {
        query.select(['id', 'name'])
      })

      return response.ok({
        ...comment.serialize(),
        message: 'Comment updated and re-submitted for approval',
      })
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commentId = Number.parseInt(params.commentId)

      if (Number.isNaN(commentId)) {
        return response.badRequest({ error: 'Invalid comment ID' })
      }

      const comment = await Comment.query()
        .where('comment_id', commentId)
        .where('deleted', false)
        .preload('post')
        .first()

      if (!comment) {
        return response.notFound({ error: 'Comment not found' })
      }

      const isCommentAuthor = comment.authorId === user.id
      const isPostOwner = comment.post.authorId === user.id

      if (!isCommentAuthor && !isPostOwner) {
        return response.forbidden({
          error: 'Only the comment author or post owner can delete this comment',
        })
      }

      comment.deleted = true
      await comment.save()

      return response.noContent()
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async updateApproval({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const commentId = Number.parseInt(params.commentId)

      if (Number.isNaN(commentId)) {
        return response.badRequest({ error: 'Invalid comment ID' })
      }

      const comment = await Comment.query()
        .where('comment_id', commentId)
        .where('deleted', false)
        .preload('post')
        .first()

      if (!comment) {
        return response.notFound({ error: 'Comment not found' })
      }

      if (comment.post.authorId !== user.id) {
        return response.forbidden({
          error: 'Only the post author can approve or reject comments',
        })
      }

      const { status } = await request.validateUsing(approvalValidator)

      comment.status = status
      await comment.save()

      await comment.load('author', (query) => {
        query.select(['id', 'name'])
      })

      return response.ok(comment)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }
}
