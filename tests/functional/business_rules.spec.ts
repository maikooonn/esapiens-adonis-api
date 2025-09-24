import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Post from '#models/post'
import Comment from '#models/comment'
import hash from '@adonisjs/core/services/hash'

test.group('Regras de Negócio dos Comentários', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let author: User
  let commenter: User
  let authorToken: string
  let commenterToken: string
  let post: Post

  group.setup(async () => {
    // prepara dados base
    author = await User.create({
      name: 'Dono do Post',
      email: 'autor@exemplo.com',
      password: await hash.make('123456'),
    })

    commenter = await User.create({
      name: 'Comentarista',
      email: 'comentarista@exemplo.com',
      password: await hash.make('123456'),
    })

    const authorAccessToken = await User.accessTokens.create(author)
    authorToken = authorAccessToken.value!.release()

    const commenterAccessToken = await User.accessTokens.create(commenter)
    commenterToken = commenterAccessToken.value!.release()

    post = await Post.create({
      title: 'Post para Testes de Regras',
      content: 'Conteúdo do post para validar regras de negócio',
      authorId: author.id,
    })
  })

  test('REGRA 1: Comentário pode ter até 1024 caracteres', async ({ client }) => {
    // texto com exatamente 1024 caracteres
    const texto1024 = 'a'.repeat(1024)

    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ text: texto1024 })

    response.assertStatus(201)
    response.assertBodyContains({ text: texto1024 })
  })

  test('REGRA 1: Comentário NÃO pode ter mais que 1024 caracteres', async ({ client }) => {
    // texto com 1025 caracteres (excede o limite)
    const texto1025 = 'a'.repeat(1025)

    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ text: texto1025 })

    response.assertStatus(422) // erro de validação
  })

  test('REGRA 2: Comentário pode ser resposta a outro comentário', async ({ client, assert }) => {
    // cria comentário pai
    const comentarioPai = await Comment.create({
      text: 'Comentário pai para teste',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    // cria resposta
    const response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({
        text: 'Esta é uma resposta ao comentário pai',
        parentId: comentarioPai.commentId,
      })

    response.assertStatus(201)
    response.assertBodyContains({
      text: 'Esta é uma resposta ao comentário pai',
      parentId: comentarioPai.commentId,
    })

    // confirma hierarquia no banco
    const resposta = await Comment.findBy('text', 'Esta é uma resposta ao comentário pai')
    assert.exists(resposta)
    assert.equal(resposta!.parentId, comentarioPai.commentId)
  })

  test('REGRA 3: Comentário só aparece se aprovado pelo dono do post', async ({ client }) => {
    // cria comentário pendente
    await Comment.create({
      text: 'Comentário pendente - não deve aparecer',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // cria comentário rejeitado
    await Comment.create({
      text: 'Comentário rejeitado - não deve aparecer',
      status: 'rejected',
      postId: post.id,
      authorId: commenter.id,
    })

    // cria comentário aprovado
    await Comment.create({
      text: 'Comentário aprovado - deve aparecer',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    // busca comentários públicos
    const response = await client.get(`/api/v1/posts/${post.id}/comments`)

    response.assertStatus(200)
    // só deve conter comentário aprovado
    response.assertBodyContains([{ text: 'Comentário aprovado - deve aparecer' }])
    // não deve conter pendentes nem rejeitados
    response.assertBodyNotContains(['pendente', 'rejeitado'])
  })

  test('REGRA 4: Dono do post pode aprovar comentários', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Comentário aguardando aprovação',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // dono do post aprova
    const response = await client
      .patch(`/api/v1/comments/${comentario.commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'approved' })

    response.assertStatus(200)

    // confirma aprovação no banco
    await comentario.refresh()
    assert.equal(comentario.status, 'approved')
  })

  test('REGRA 4: Dono do post pode rejeitar comentários', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Comentário para rejeitar',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // dono do post rejeita
    const response = await client
      .patch(`/api/v1/comments/${comentario.commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'rejected' })

    response.assertStatus(200)

    // confirma rejeição no banco
    await comentario.refresh()
    assert.equal(comentario.status, 'rejected')
  })

  test('REGRA 4: APENAS dono do post pode aprovar/rejeitar', async ({ client }) => {
    const comentario = await Comment.create({
      text: 'Comentário teste',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // comentarista (não dono) tenta aprovar
    const response = await client
      .patch(`/api/v1/comments/${comentario.commentId}/approval`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ status: 'approved' })

    response.assertStatus(403) // proibido
    response.assertBodyContains({
      error: 'Only the post author can approve or reject comments',
    })
  })

  test('REGRA 5: Dono do comentário pode editar', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Texto original',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    // dono edita próprio comentário
    const response = await client
      .put(`/api/v1/comments/${comentario.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ text: 'Texto editado pelo próprio autor' })

    response.assertStatus(200)

    // confirma edição no banco
    await comentario.refresh()
    assert.equal(comentario.text, 'Texto editado pelo próprio autor')
  })

  test('REGRA 5: Dono do comentário pode deletar', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Comentário para deletar',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    // dono deleta próprio comentário
    const response = await client
      .delete(`/api/v1/comments/${comentario.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)

    response.assertStatus(204)

    // confirma soft delete no banco
    await comentario.refresh()
    assert.equal(comentario.deleted, true)
  })

  test('REGRA 5: Dono do POST pode deletar comentário', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Comentário ofensivo',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    // dono do post pode deletar comentário
    const response = await client
      .delete(`/api/v1/comments/${comentario.commentId}`)
      .header('authorization', `Bearer ${authorToken}`) // token do autor do post

    response.assertStatus(204)

    // confirma soft delete no banco
    await comentario.refresh()
    assert.equal(comentario.deleted, true)
  })

  test('REGRA 6: Delete é APENAS lógico (soft delete)', async ({ client, assert }) => {
    const comentario = await Comment.create({
      text: 'Comentário a ser deletado logicamente',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    const comentarioId = comentario.commentId

    // deleta comentário
    await client
      .delete(`/api/v1/comments/${comentarioId}`)
      .header('authorization', `Bearer ${commenterToken}`)

    // comentário ainda existe no banco
    const comentarioNoBanco = await Comment.find(comentarioId)
    assert.exists(comentarioNoBanco)

    // mas está marcado como deletado
    assert.equal(comentarioNoBanco!.deleted, true)

    // texto permanece intacto
    assert.equal(comentarioNoBanco!.text, 'Comentário a ser deletado logicamente')
  })

  test('REGRA 6: Comentários deletados não aparecem nas listagens', async ({ client, assert }) => {
    // cria comentário normal
    const comentarioNormal = await Comment.create({
      text: 'Comentário normal visível',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
    })

    // cria comentário deletado
    const comentarioDeletado = await Comment.create({
      text: 'Comentário deletado invisível',
      status: 'approved',
      postId: post.id,
      authorId: commenter.id,
      deleted: true, // marcado como deletado
    })

    // busca comentários públicos
    const response = await client.get(`/api/v1/posts/${post.id}/comments`)

    response.assertStatus(200)

    // deve conter apenas o comentário não deletado
    response.assertBodyContains([{ text: 'Comentário normal visível' }])

    // NÃO deve conter o comentário deletado
    response.assertBodyNotContains(['Comentário deletado invisível'])

    // mas comentário deletado ainda existe no banco
    const comentarioNoBanco = await Comment.find(comentarioDeletado.commentId)
    assert.exists(comentarioNoBanco)
    assert.equal(comentarioNoBanco!.deleted, true)
  })

  test('FLUXO COMPLETO: Todas as regras funcionando juntas', async ({ client, assert }) => {
    // 1. cria comentário com 1024 caracteres
    const textoMaximo = 'Este é um comentário com exatamente 1024 caracteres. ' + 'a'.repeat(967)

    let response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ text: textoMaximo })

    response.assertStatus(201)
    const { commentId } = response.body()

    // 2. comentário fica pendente por padrão
    response = await client.get(`/api/v1/posts/${post.id}/comments`)
    response.assertBodyNotContains([textoMaximo]) // não aparece

    // 3. dono do post aprova
    response = await client
      .patch(`/api/v1/comments/${commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'approved' })

    response.assertStatus(200)

    // 4. agora comentário aparece
    response = await client.get(`/api/v1/posts/${post.id}/comments`)
    response.assertBodyContains([{ text: textoMaximo }])

    // 5. cria resposta ao comentário
    response = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({
        text: 'Resposta ao comentário',
        parentId: commentId,
      })

    const { commentId: respostaId } = response.body()

    // 6. aprova resposta
    await client
      .patch(`/api/v1/comments/${respostaId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'approved' })

    // 7. verifica estrutura aninhada
    response = await client.get(`/api/v1/posts/${post.id}/comments`)
    const comments = response.body()
    const comentarioPai = comments.find((c: any) => c.commentId === commentId)

    assert.exists(comentarioPai)
    assert.isArray(comentarioPai.replies)
    assert.lengthOf(comentarioPai.replies, 1)
    assert.equal(comentarioPai.replies[0].text, 'Resposta ao comentário')

    // 8. testa soft delete
    response = await client
      .delete(`/api/v1/comments/${commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)

    response.assertStatus(204)

    // 9. comentário não aparece mais
    response = await client.get(`/api/v1/posts/${post.id}/comments`)
    response.assertBodyNotContains([textoMaximo])

    // 10. mas ainda existe no banco
    const comentarioNoBanco = await Comment.find(commentId)
    assert.exists(comentarioNoBanco)
    assert.equal(comentarioNoBanco!.deleted, true)
    assert.equal(comentarioNoBanco!.text, textoMaximo) // dados preservados
  })
})
