/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const PostsController = () => import('#controllers/posts_controller')
const CommentsController = () => import('#controllers/comments_controller')

// Health check
router.get('/', async () => {
  return {
    message: 'Comments API - AdonisJS',
    version: '1.0.0',
  }
})

// API v1 routes
router
  .group(() => {
    // Authentication routes
    router
      .group(() => {
        router.post('/login', [AuthController, 'login'])
        router.get('/me', [AuthController, 'me']).use(middleware.auth())
      })
      .prefix('/auth')

    // User routes
    router
      .group(() => {
        router.get('/', [UsersController, 'index'])
        router.post('/', [UsersController, 'store'])
        router.get('/:id', [UsersController, 'show'])
        router.put('/:id', [UsersController, 'update'])
        router.delete('/:id', [UsersController, 'destroy'])
      })
      .prefix('/users')

    // Post routes
    router
      .group(() => {
        router.get('/', [PostsController, 'index'])
        router.post('/', [PostsController, 'store']).use(middleware.auth())
        router.get('/:id', [PostsController, 'show'])
        router.put('/:id', [PostsController, 'update']).use(middleware.auth())
        router.delete('/:id', [PostsController, 'destroy']).use(middleware.auth())

        // Comment routes nested under posts
        router.get('/:postId/comments', [PostsController, 'comments'])
        router.post('/:postId/comments', [PostsController, 'createComment']).use(middleware.auth())
        router
          .get('/:postId/comments/pending', [PostsController, 'pendingComments'])
          .use(middleware.auth())
      })
      .prefix('/posts')

    // Comment routes (for update, delete and approval)
    router
      .group(() => {
        router.put('/:commentId', [CommentsController, 'update']).use(middleware.auth())
        router.delete('/:commentId', [CommentsController, 'destroy']).use(middleware.auth())
        router
          .patch('/:commentId/approval', [CommentsController, 'updateApproval'])
          .use(middleware.auth())
      })
      .prefix('/comments')
  })
  .prefix('/api/v1')
