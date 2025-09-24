import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

test.group('Autenticação', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deve fazer login com credenciais válidas', async ({ client }) => {
    // cria um usuário pra testar
    const user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.post('/api/v1/auth/login').json({
      email: 'joao@teste.com',
      password: '123456',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: 'João Silva',
        email: 'joao@teste.com',
      },
    })
    response.assertBodyContains(['token'])
  })

  test('deve rejeitar login com email inválido', async ({ client }) => {
    const response = await client.post('/api/v1/auth/login').json({
      email: 'inexistente@teste.com',
      password: '123456',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      error: 'Credenciais inválidas',
    })
  })

  test('deve rejeitar login com senha inválida', async ({ client }) => {
    await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.post('/api/v1/auth/login').json({
      email: 'joao@teste.com',
      password: 'senhaerrada',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      error: 'Credenciais inválidas',
    })
  })

  test('deve validar formato do email', async ({ client }) => {
    const response = await client.post('/api/v1/auth/login').json({
      email: 'email-inválido',
      password: '123456',
    })

    response.assertStatus(422)
  })

  test('deve exigir senha mínima', async ({ client }) => {
    const response = await client.post('/api/v1/auth/login').json({
      email: 'joao@teste.com',
      password: '123',
    })

    response.assertStatus(422)
  })

  test('deve retornar perfil do usuário autenticado', async ({ client }) => {
    const user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    // faz login e pega o token
    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'joao@teste.com',
      password: '123456',
    })

    const { token } = loginResponse.body()

    // usa o token pra acessar o perfil
    const response = await client
      .get('/api/v1/auth/me')
      .header('authorization', `Bearer ${token.token}`)

    response.assertStatus(200)
    response.assertBodyContains({
      id: user.id,
      name: 'João Silva',
      email: 'joao@teste.com',
    })
    response.assertBodyContains(['_count'])
  })

  test('deve rejeitar acesso sem token', async ({ client }) => {
    const response = await client.get('/api/v1/auth/me')

    response.assertStatus(401)
  })

  test('deve rejeitar token inválido', async ({ client }) => {
    const response = await client
      .get('/api/v1/auth/me')
      .header('authorization', 'Bearer token-inválido')

    response.assertStatus(401)
  })
})
