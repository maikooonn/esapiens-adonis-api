import type { HttpContext } from '@adonisjs/core/http'
import Post from '../models/post.js'
import Comment from '../models/comment.js'
import vine from '@vinejs/vine'

const createPostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3).maxLength(255),
    content: vine.string().minLength(10),
  })
)

const updatePostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(3).maxLength(255).optional(),
    content: vine.string().minLength(10).optional(),
  })
)

const createCommentValidator = vine.compile(
  vine.object({
    text: vine.string().minLength(3).maxLength(1024),
    parentId: vine.number().optional(),
  })
)

export default class PostsController {
  async index({ response }: HttpContext) {
    try {
      const posts = await Post.query()
        .preload('author', (query) => {
          query.select(['id', 'name', 'email'])
        })
        .orderBy('created_at', 'desc')

      return response.ok(posts)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const postId = Number.parseInt(params.id)
      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const post = await Post.query()
        .where('id', postId)
        .preload('author', (query) => {
          query.select(['id', 'name', 'email'])
        })
        .first()

      if (!post) {
        return response.notFound({ error: 'Post not found' })
      }

      return response.ok(post)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async store({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const { title, content } = await request.validateUsing(createPostValidator)

      const post = await Post.create({
        title,
        content,
        authorId: user.id,
      })

      await post.load('author', (query) => {
        query.select(['id', 'name', 'email'])
      })

      return response.created(post)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async update({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const postId = Number.parseInt(params.id)

      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const post = await Post.find(postId)
      if (!post) {
        return response.notFound({ error: 'Post not found' })
      }

      if (post.authorId !== user.id) {
        return response.forbidden({
          error: 'Only the post author can edit this post',
        })
      }

      const payload = await request.validateUsing(updatePostValidator)
      post.merge(payload)
      await post.save()

      await post.load('author', (query) => {
        query.select(['id', 'name', 'email'])
      })

      return response.ok(post)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async destroy({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const postId = Number.parseInt(params.id)

      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const post = await Post.find(postId)
      if (!post) {
        return response.notFound({ error: 'Post not found' })
      }

      if (post.authorId !== user.id) {
        return response.forbidden({
          error: 'Only the post author can delete this post',
        })
      }

      await post.delete()
      return response.noContent()
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async comments({ params, response }: HttpContext) {
    try {
      const postId = Number.parseInt(params.postId)
      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const comments = await Comment.query()
        .where('post_id', postId)
        .where('status', 'approved')
        .where('deleted', false)
        .preload('author', (query) => {
          query.select(['id', 'name'])
        })
        .preload('replies', (replyQuery) => {
          replyQuery
            .where('status', 'approved')
            .where('deleted', false)
            .preload('author', (authorQuery) => {
              authorQuery.select(['id', 'name'])
            })
        })
        .whereNull('parent_id')
        .orderBy('created_at', 'asc')

      return response.ok(comments)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async pendingComments({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const postId = Number.parseInt(params.postId)

      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const post = await Post.find(postId)
      if (!post) {
        return response.notFound({ error: 'Post not found' })
      }

      if (post.authorId !== user.id) {
        return response.forbidden({
          error: 'Only the post author can view pending comments',
        })
      }

      const comments = await Comment.query()
        .where('post_id', postId)
        .where('status', 'pending')
        .where('deleted', false)
        .preload('author', (query) => {
          query.select(['id', 'name'])
        })
        .orderBy('created_at', 'desc')

      return response.ok(comments)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async createComment({ params, request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const postId = Number.parseInt(params.postId)

      if (Number.isNaN(postId)) {
        return response.badRequest({ error: 'Invalid post ID' })
      }

      const post = await Post.find(postId)
      if (!post) {
        return response.notFound({ error: 'Post not found' })
      }

      const { text, parentId } = await request.validateUsing(createCommentValidator)

      if (parentId) {
        const parentComment = await Comment.find(parentId)
        if (!parentComment || parentComment.postId !== postId) {
          return response.badRequest({ error: 'Invalid parent comment' })
        }
      }

      const comment = await Comment.create({
        postId,
        authorId: user.id,
        text,
        parentId: parentId || null,
        status: 'pending',
      })

      await comment.load('author', (query) => {
        query.select(['id', 'name'])
      })

      return response.created(comment)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }
}
