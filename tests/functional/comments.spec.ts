import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Post from '#models/post'
import Comment from '#models/comment'
import hash from '@adonisjs/core/services/hash'

test.group('Comentários', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let author: User
  let commenter: User
  let authorToken: string
  let commenterToken: string
  let post: Post

  group.setup(async () => {
    // cria autor do post
    author = await User.create({
      name: 'Autor do Post',
      email: 'autor@teste.com',
      password: await hash.make('123456'),
    })

    // cria comentarista
    commenter = await User.create({
      name: 'Comentarista',
      email: 'comentarista@teste.com',
      password: await hash.make('123456'),
    })

    // cria tokens
    const authorAccessToken = await User.accessTokens.create(author)
    authorToken = authorAccessToken.value!.release()

    const commenterAccessToken = await User.accessTokens.create(commenter)
    commenterToken = commenterAccessToken.value!.release()

    // cria post
    post = await Post.create({
      title: 'Post para Comentários',
      content: 'Conteúdo do post para testar comentários',
      authorId: author.id,
    })
  })

  test('deve criar comentário em post', async ({ client, assert }) => {
    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: 'Ótimo post! Gostei muito do conteúdo.',
      })

    response.assertStatus(201)
    response.assertBodyContains({
      text: 'Ótimo post! Gostei muito do conteúdo.',
      status: 'pending',
      authorId: commenter.id,
      postId: post.id,
    })

    // verifica no banco
    const comment = await Comment.findBy('text', 'Ótimo post! Gostei muito do conteúdo.')
    assert.exists(comment)
    assert.equal(comment!.status, 'pending')
  })

  test('deve criar resposta a comentário', async ({ client, assert }) => {
    // cria comentário pai
    const parentComment = await Comment.create({
      text: 'Comentário pai',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({
        text: 'Obrigado pelo comentário!',
        parentId: parentComment.commentId,
      })

    response.assertStatus(201)
    response.assertBodyContains({
      text: 'Obrigado pelo comentário!',
      parentId: parentComment.commentId,
      status: 'pending',
    })

    // verifica no banco
    const reply = await Comment.findBy('text', 'Obrigado pelo comentário!')
    assert.exists(reply)
    assert.equal(reply!.parentId, parentComment.commentId)
  })

  test('deve validar tamanho máximo do comentário', async ({ client }) => {
    const longText = 'a'.repeat(1025) // 1025 caracteres

    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: longText,
      })

    response.assertStatus(422)
  })

  test('deve listar comentários aprovados do post', async ({ client }) => {
    // cria comentários com diferentes status
    const approved = await Comment.create({
      text: 'Comentário aprovado',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    await Comment.create({
      text: 'Comentário pendente',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    await Comment.create({
      text: 'Comentário rejeitado',
      status: 'rejected',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client.get(`/api/v1/posts/${post.id}/comments`)

    response.assertStatus(200)
    // deve retornar apenas comentários aprovados
    response.assertBodyContains([
      {
        commentId: approved.commentId,
        text: 'Comentário aprovado',
        status: 'approved',
      },
    ])
    // não deve conter pendentes ou rejeitados
    response.assertBodyNotContains(['Comentário pendente', 'Comentário rejeitado'])
  })

  test('deve listar comentários pendentes para autor do post', async ({ client }) => {
    await Comment.create({
      text: 'Comentário pendente 1',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    await Comment.create({
      text: 'Comentário pendente 2',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .get(`/api/v1/posts/${post.id}/comments/pending`)
      .header('authorization', `Bearer ${authorToken}`)

    response.assertStatus(200)
    response.assertBodyContains([
      { text: 'Comentário pendente 1' },
      { text: 'Comentário pendente 2' },
    ])
  })

  test('deve impedir acesso a comentários pendentes para não autor', async ({ client }) => {
    const response = await client
      .get(`/api/v1/posts/${post.id}/comments/pending`)
      .header('authorization', `Bearer ${commenterToken}`)

    response.assertStatus(403)
    response.assertBodyContains({
      error: 'Only the post author can view pending comments',
    })
  })

  test('deve aprovar comentário (autor do post)', async ({ client, assert }) => {
    const comment = await Comment.create({
      text: 'Comentário para aprovar',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .patch(`/api/v1/comments/${comment.commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({
        status: 'approved',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      status: 'approved',
    })

    // verifica no banco
    await comment.refresh()
    assert.equal(comment.status, 'approved')
  })

  test('deve rejeitar comentário (autor do post)', async ({ client, assert }) => {
    const comment = await Comment.create({
      text: 'Comentário para rejeitar',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .patch(`/api/v1/comments/${comment.commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({
        status: 'rejected',
      })

    response.assertStatus(200)

    // verifica no banco
    await comment.refresh()
    assert.equal(comment.status, 'rejected')
  })

  test('deve impedir aprovação por usuário não autor do post', async ({ client }) => {
    const comment = await Comment.create({
      text: 'Comentário teste',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .patch(`/api/v1/comments/${comment.commentId}/approval`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        status: 'approved',
      })

    response.assertStatus(403)
    response.assertBodyContains({
      error: 'Only the post author can approve or reject comments',
    })
  })

  test('deve editar próprio comentário (status pending)', async ({ client, assert }) => {
    const comment = await Comment.create({
      text: 'Comentário original',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .put(`/api/v1/comments/${comment.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: 'Comentário editado com novo conteúdo',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      text: 'Comentário editado com novo conteúdo',
      status: 'pending', // volta para pending após edição
    })

    // verifica no banco
    await comment.refresh()
    assert.equal(comment.text, 'Comentário editado com novo conteúdo')
    assert.equal(comment.status, 'pending')
  })

  test('deve impedir edição de comentário aprovado', async ({ client }) => {
    const comment = await Comment.create({
      text: 'Comentário aprovado',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .put(`/api/v1/comments/${comment.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: 'Tentando editar',
      })

    response.assertStatus(400)
    response.assertBodyContains({
      error: 'Cannot edit approved comments',
    })
  })

  test('deve deletar próprio comentário (soft delete)', async ({ client, assert }) => {
    const comment = await Comment.create({
      text: 'Comentário para deletar',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .delete(`/api/v1/comments/${comment.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)

    response.assertStatus(204)

    // confirma que marcou como deletado
    await comment.refresh()
    assert.equal(comment.deleted, true)
  })

  test('deve permitir autor do post deletar comentário', async ({ client, assert }) => {
    const comment = await Comment.create({
      text: 'Comentário ofensivo',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .delete(`/api/v1/comments/${comment.commentId}`)
      .header('authorization', `Bearer ${authorToken}`) // autor do post

    response.assertStatus(204)

    // confirma que marcou como deletado
    await comment.refresh()
    assert.equal(comment.deleted, true)
  })

  test('deve impedir deleção por usuário não autorizado', async ({ client }) => {
    const otherUser = await User.create({
      name: 'Outro Usuário',
      email: 'outro@teste.com',
      password: await hash.make('123456'),
    })
    const otherToken = (await User.accessTokens.create(otherUser)).value!.release()

    const comment = await Comment.create({
      text: 'Comentário protegido',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    const response = await client
      .delete(`/api/v1/comments/${comment.commentId}`)
      .header('authorization', `Bearer ${otherToken}`)

    response.assertStatus(403)
    response.assertBodyContains({
      error: 'Only the comment author or post owner can delete this comment',
    })
  })

  test('deve exigir autenticação para operações de comentário', async ({ client }) => {
    const comment = await Comment.create({
      text: 'Comentário teste',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // criar comentário
    let response = await client.post(`/api/v1/posts/${post.id}/comments`).json({
      text: 'Novo comentário',
    })
    response.assertStatus(401)

    // editar comentário
    response = await client.put(`/api/v1/comments/${comment.commentId}`).json({
      text: 'Comentário editado',
    })
    response.assertStatus(401)

    // deletar comentário
    response = await client.delete(`/api/v1/comments/${comment.commentId}`)
    response.assertStatus(401)

    // aprovar comentário
    response = await client
      .patch(`/api/v1/comments/${comment.commentId}/approval`)
      .json({ status: 'approved' })
    response.assertStatus(401)
  })
})