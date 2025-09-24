/*
|--------------------------------------------------------------------------
| Arquivo de rotas
|--------------------------------------------------------------------------
|
| Aqui ficam todas as rotas HTTP da aplicação
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const PostsController = () => import('#controllers/posts_controller')
const CommentsController = () => import('#controllers/comments_controller')

// checagem básica da API
router.get('/', async () => {
  return {
    message: 'API de Comentários - AdonisJS',
    version: '1.0.0',
  }
})

// rotas da API v1
router
  .group(() => {
    // rotas de autenticação
    router
      .group(() => {
        router.post('/login', [AuthController, 'login'])
        router.get('/me', [AuthController, 'me']).use(middleware.auth())
      })
      .prefix('/auth')

    // rotas de usuários
    router
      .group(() => {
        router.get('/', [UsersController, 'index'])
        router.post('/', [UsersController, 'store'])
        router.get('/:id', [UsersController, 'show'])
        router.put('/:id', [UsersController, 'update'])
        router.delete('/:id', [UsersController, 'destroy'])
      })
      .prefix('/users')

    // rotas de posts
    router
      .group(() => {
        router.get('/', [PostsController, 'index'])
        router.post('/', [PostsController, 'store']).use(middleware.auth())
        router.get('/:id', [PostsController, 'show'])
        router.put('/:id', [PostsController, 'update']).use(middleware.auth())
        router.delete('/:id', [PostsController, 'destroy']).use(middleware.auth())

        // rotas de comentários dentro de posts
        router.get('/:postId/comments', [PostsController, 'comments'])
        router.post('/:postId/comments', [PostsController, 'createComment']).use(middleware.auth())
        router
          .get('/:postId/comments/pending', [PostsController, 'pendingComments'])
          .use(middleware.auth())
      })
      .prefix('/posts')

    // rotas de comentários (editar, deletar e aprovar)
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
