import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Post from '#models/post'
import hash from '@adonisjs/core/services/hash'

test.group('Posts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let token: string

  group.setup(async () => {
    // prepara usuário e token pros testes
    user = await User.create({
      name: 'João Silva',
      email: 'joao@teste.com',
      password: await hash.make('123456'),
    })

    const accessToken = await User.accessTokens.create(user)
    token = accessToken.value!.release()
  })

  test('deve listar posts', async ({ client }) => {
    const post1 = await Post.create({
      title: 'Primeiro Post',
      content: 'Conteúdo do primeiro post',
      authorId: user.id,
    })

    const post2 = await Post.create({
      title: 'Segundo Post',
      content: 'Conteúdo do segundo post',
      authorId: user.id,
    })

    const response = await client.get('/api/v1/posts')

    response.assertStatus(200)
    response.assertBodyContains([
      {
        id: post1.id,
        title: 'Primeiro Post',
        content: 'Conteúdo do primeiro post',
      },
      {
        id: post2.id,
        title: 'Segundo Post',
        content: 'Conteúdo do segundo post',
      },
    ])
  })

  test('deve criar post com dados válidos', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/posts')
      .header('authorization', `Bearer ${token}`)
      .json({
        title: 'Novo Post',
        content: 'Conteúdo do novo post que tem mais de 10 caracteres',
      })

    response.assertStatus(201)
    response.assertBodyContains({
      title: 'Novo Post',
      content: 'Conteúdo do novo post que tem mais de 10 caracteres',
      authorId: user.id,
    })

    // confirma que salvou no banco
    const post = await Post.findBy('title', 'Novo Post')
    assert.exists(post)
    assert.equal(post!.authorId, user.id)
  })

  test('deve exigir autenticação para criar post', async ({ client }) => {
    const response = await client.post('/api/v1/posts').json({
      title: 'Novo Post',
      content: 'Conteúdo do novo post',
    })

    response.assertStatus(401)
  })

  test('deve validar título obrigatório', async ({ client }) => {
    const response = await client
      .post('/api/v1/posts')
      .header('authorization', `Bearer ${token}`)
      .json({
        content: 'Conteúdo do post',
      })

    response.assertStatus(422)
  })

  test('deve validar conteúdo mínimo', async ({ client }) => {
    const response = await client
      .post('/api/v1/posts')
      .header('authorization', `Bearer ${token}`)
      .json({
        title: 'Título',
        content: 'Curto',
      })

    response.assertStatus(422)
  })

  test('deve buscar post por ID', async ({ client }) => {
    const post = await Post.create({
      title: 'Post de Teste',
      content: 'Conteúdo de teste',
      authorId: user.id,
    })

    const response = await client.get(`/api/v1/posts/${post.id}`)

    response.assertStatus(200)
    response.assertBodyContains({
      id: post.id,
      title: 'Post de Teste',
      content: 'Conteúdo de teste',
      author: {
        id: user.id,
        name: 'João Silva',
      },
    })
  })

  test('deve retornar 404 para post inexistente', async ({ client }) => {
    const response = await client.get('/api/v1/posts/999999')

    response.assertStatus(404)
    response.assertBodyContains({
      error: 'Post not found',
    })
  })

  test('deve atualizar post do próprio usuário', async ({ client, assert }) => {
    const post = await Post.create({
      title: 'Post Original',
      content: 'Conteúdo original',
      authorId: user.id,
    })

    const response = await client
      .put(`/api/v1/posts/${post.id}`)
      .header('authorization', `Bearer ${token}`)
      .json({
        title: 'Post Atualizado',
        content: 'Conteúdo atualizado com mais caracteres',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      title: 'Post Atualizado',
      content: 'Conteúdo atualizado com mais caracteres',
    })

    // confirma no banco
    await post.refresh()
    assert.equal(post.title, 'Post Atualizado')
  })

  test('deve impedir atualização de post de outro usuário', async ({ client }) => {
    const otherUser = await User.create({
      name: 'Outro Usuário',
      email: 'outro@teste.com',
      password: await hash.make('123456'),
    })

    const post = await Post.create({
      title: 'Post de Outro',
      content: 'Conteúdo de outro usuário',
      authorId: otherUser.id,
    })

    const response = await client
      .put(`/api/v1/posts/${post.id}`)
      .header('authorization', `Bearer ${token}`)
      .json({
        title: 'Tentando Alterar',
      })

    response.assertStatus(403)
    response.assertBodyContains({
      error: 'Only the post author can edit this post',
    })
  })

  test('deve deletar post do próprio usuário', async ({ client, assert }) => {
    const post = await Post.create({
      title: 'Post para Deletar',
      content: 'Este post será deletado',
      authorId: user.id,
    })

    const response = await client
      .delete(`/api/v1/posts/${post.id}`)
      .header('authorization', `Bearer ${token}`)

    response.assertStatus(204)

    // confirma que deletou
    const deletedPost = await Post.find(post.id)
    assert.isNull(deletedPost)
  })

  test('deve impedir deleção de post de outro usuário', async ({ client }) => {
    const otherUser = await User.create({
      name: 'Outro Usuário',
      email: 'outro@teste.com',
      password: await hash.make('123456'),
    })

    const post = await Post.create({
      title: 'Post de Outro',
      content: 'Conteúdo de outro usuário',
      authorId: otherUser.id,
    })

    const response = await client
      .delete(`/api/v1/posts/${post.id}`)
      .header('authorization', `Bearer ${token}`)

    response.assertStatus(403)
    response.assertBodyContains({
      error: 'Only the post author can delete this post',
    })
  })

  test('deve exigir autenticação para operações CUD', async ({ client }) => {
    const post = await Post.create({
      title: 'Post de Teste',
      content: 'Conteúdo de teste',
      authorId: user.id,
    })

    // tentar criar post
    let response = await client.post('/api/v1/posts').json({
      title: 'Novo Post',
      content: 'Conteúdo do post',
    })
    response.assertStatus(401)

    // tentar atualizar post
    response = await client.put(`/api/v1/posts/${post.id}`).json({
      title: 'Post Atualizado',
    })
    response.assertStatus(401)

    // tentar deletar post
    response = await client.delete(`/api/v1/posts/${post.id}`)
    response.assertStatus(401)
  })
})
