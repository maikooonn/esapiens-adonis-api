import type { HttpContext } from '@adonisjs/core/http'
import User from '../models/user.js'
import vine from '@vinejs/vine'

const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(6),
  })
)

export default class AuthController {
  async login({ request, response }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(loginValidator)

      const user = await User.verifyCredentials(email, password)

      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: '3h',
      })

      return response.ok({
        message: 'Login realizado com sucesso',
        token: token.value!.release(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      return response.unauthorized({ error: 'Credenciais inválidas' })
    }
  }

  async me({ auth, response }: HttpContext) {
    try {
      const user = await auth.user!

      const userData = await User.query()
        .where('id', user.id)
        .preload('posts')
        .preload('comments')
        .first()

      if (!userData) {
        return response.notFound({ error: 'Usuário não encontrado' })
      }

      return response.ok({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        _count: {
          posts: userData.posts.length,
          comments: userData.comments.length,
        },
      })
    } catch (error) {
      return response.internalServerError({ error: 'Erro interno do servidor' })
    }
  }
}
