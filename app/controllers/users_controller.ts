import type { HttpContext } from '@adonisjs/core/http'
import User from '../models/user.js'
import vine from '@vinejs/vine'
import hash from '@adonisjs/core/services/hash'

const createUserValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(100),
    email: vine.string().email(),
    password: vine.string().minLength(6),
  })
)

const updateUserValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(100).optional(),
    email: vine.string().email().optional(),
  })
)

export default class UsersController {
  async index({ response }: HttpContext) {
    try {
      const users = await User.query().select(['id', 'name', 'email', 'created_at', 'updated_at'])

      return response.ok(users)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const userId = Number.parseInt(params.id)
      if (Number.isNaN(userId)) {
        return response.badRequest({ error: 'Invalid user ID' })
      }

      const user = await User.query()
        .where('id', userId)
        .select(['id', 'name', 'email', 'created_at', 'updated_at'])
        .first()

      if (!user) {
        return response.notFound({ error: 'User not found' })
      }

      return response.ok(user)
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const { name, email, password } = await request.validateUsing(createUserValidator)

      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        return response.conflict({ error: 'E-mail já está em uso' })
      }

      const hashedPassword = await hash.make(password)

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
      })

      return response.created({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const userId = Number.parseInt(params.id)
      if (Number.isNaN(userId)) {
        return response.badRequest({ error: 'Invalid user ID' })
      }

      const user = await User.find(userId)
      if (!user) {
        return response.notFound({ error: 'User not found' })
      }

      const payload = await request.validateUsing(updateUserValidator)

      if (payload.email && payload.email !== user.email) {
        const existingUser = await User.findBy('email', payload.email)
        if (existingUser) {
          return response.badRequest({ error: 'Email already exists' })
        }
      }

      user.merge(payload)
      await user.save()

      return response.ok({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const userId = Number.parseInt(params.id)
      if (Number.isNaN(userId)) {
        return response.badRequest({ error: 'Invalid user ID' })
      }

      const user = await User.find(userId)
      if (!user) {
        return response.notFound({ error: 'User not found' })
      }

      await user.delete()
      return response.noContent()
    } catch (error) {
      return response.internalServerError({ error: 'Internal server error' })
    }
  }
}
