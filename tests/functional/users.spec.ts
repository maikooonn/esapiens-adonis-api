import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

test.group('Usuários', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deve listar usuários', async ({ client }) => {
    await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    await User.create({
      name: 'Maria Santos',
      email: 'maria@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.get('/api/v1/users')

    response.assertStatus(200)
    response.assertBodyContains([
      { name: 'João Silva', email: 'joao@teste.com' },
      { name: 'Maria Santos', email: 'maria@teste.com' },
    ])
  })

  test('deve criar usuário com dados válidos', async ({ client, assert }) => {
    const response = await client.post('/api/v1/users').json({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: '123456',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      message: 'Usuário criado com sucesso',
      user: {
        name: 'João Silva',
        email: 'joao@teste.com',
      },
    })

    // confirma que salvou no banco
    const user = await User.findBy('email', 'joao@teste.com')
    assert.exists(user)
    assert.equal(user!.name, 'João Silva')
  })

  test('deve rejeitar usuário com email duplicado', async ({ client }) => {
    // cria o primeiro usuário
    await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    // tenta criar outro com o mesmo email
    const response = await client.post('/api/v1/users').json({
      name: 'João Santos',
      email: 'joao@teste.com',
      password: '123456',
    })

    response.assertStatus(409)
    response.assertBodyContains({
      error: 'E-mail já está em uso',
    })
  })

  test('deve validar campos obrigatórios', async ({ client }) => {
    const response = await client.post('/api/v1/users').json({})

    response.assertStatus(422)
  })

  test('deve validar formato do email', async ({ client }) => {
    const response = await client.post('/api/v1/users').json({
      name: 'João Silva',
      email: 'email-inválido',
      password: '123456',
    })

    response.assertStatus(422)
  })

  test('deve exigir senha mínima', async ({ client }) => {
    const response = await client.post('/api/v1/users').json({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: '123',
    })

    response.assertStatus(422)
  })

  test('deve buscar usuário por ID', async ({ client }) => {
    const user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.get(`/api/v1/users/${user.id}`)

    response.assertStatus(200)
    response.assertBodyContains({
      id: user.id,
      name: 'João Silva',
      email: 'joao@teste.com',
    })
    response.assertBodyContains(['_count'])
  })

  test('deve retornar 404 para usuário inexistente', async ({ client }) => {
    const response = await client.get('/api/v1/users/999999')

    response.assertStatus(404)
    response.assertBodyContains({
      error: 'User not found',
    })
  })

  test('deve retornar erro para ID inválido', async ({ client }) => {
    const response = await client.get('/api/v1/users/abc')

    response.assertStatus(400)
    response.assertBodyContains({
      error: 'Invalid user ID',
    })
  })

  test('deve atualizar usuário', async ({ client, assert }) => {
    const user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.put(`/api/v1/users/${user.id}`).json({
      name: 'João Santos',
      email: 'joao.santos@teste.com',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      id: user.id,
      name: 'João Santos',
      email: 'joao.santos@teste.com',
    })

    // confirma que atualizou no banco
    await user.refresh()
    assert.equal(user.name, 'João Santos')
    assert.equal(user.email, 'joao.santos@teste.com')
  })

  test('deve rejeitar atualização com email duplicado', async ({ client }) => {
    await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const user2 = await User.create({
      name: 'Maria Santos',
      email: 'maria@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.put(`/api/v1/users/${user2.id}`).json({
      email: 'joao@teste.com',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      error: 'Email already exists',
    })
  })

  test('deve deletar usuário', async ({ client, assert }) => {
    const user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const response = await client.delete(`/api/v1/users/${user.id}`)

    response.assertStatus(204)

    // confirma que deletou do banco
    const deletedUser = await User.find(user.id)
    assert.isNull(deletedUser)
  })

  test('deve retornar 404 ao tentar deletar usuário inexistente', async ({ client }) => {
    const response = await client.delete('/api/v1/users/999999')

    response.assertStatus(404)
    response.assertBodyContains({
      error: 'User not found',
    })
  })
})
