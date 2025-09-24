import { test } from '@japa/runner'

test.group('Health Check', () => {
  test('deve retornar informações da API na rota raiz', async ({ client }) => {
    const response = await client.get('/')

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'API de Comentários - AdonisJS',
      version: '1.0.0',
    })
  })
})
