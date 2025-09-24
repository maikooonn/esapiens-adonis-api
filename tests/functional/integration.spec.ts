import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Post from '#models/post'
import Comment from '#models/comment'
import hash from '@adonisjs/core/services/hash'

test.group('Integração - Fluxos Completos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('fluxo completo: criar usuário, fazer login, criar post e comentar', async ({
    client,
    assert,
  }) => {
    // 1. cria usuário autor
    const authorResponse = await client.post('/api/v1/users').json({
      name: 'João Autor',
      email: 'autor@teste.com',
      password: '123456',
    })
    authorResponse.assertStatus(201)

    // 2. cria usuário comentarista
    const commenterResponse = await client.post('/api/v1/users').json({
      name: 'Maria Comentarista',
      email: 'comentarista@teste.com',
      password: '123456',
    })
    commenterResponse.assertStatus(201)

    // 3. faz login do autor
    const authorLoginResponse = await client.post('/api/v1/auth/login').json({
      email: 'autor@teste.com',
      password: '123456',
    })
    authorLoginResponse.assertStatus(200)
    const { token: authorToken } = authorLoginResponse.body()

    // 4. faz login do comentarista
    const commenterLoginResponse = await client.post('/api/v1/auth/login').json({
      email: 'comentarista@teste.com',
      password: '123456',
    })
    commenterLoginResponse.assertStatus(200)
    const { token: commenterToken } = commenterLoginResponse.body()

    // 5. autor cria post
    const postResponse = await client
      .post('/api/v1/posts')
      .header('authorization', `Bearer ${authorToken.token}`)
      .json({
        title: 'Meu Primeiro Post',
        content: 'Este é o conteúdo do meu primeiro post com muito texto interessante',
      })
    postResponse.assertStatus(201)
    const { id: postId } = postResponse.body()

    // 6. comentarista adiciona comentário
    const commentResponse = await client
      .post(`/api/v1/posts/${postId}/comments`)
      .header('authorization', `Bearer ${commenterToken.token}`)
      .json({
        text: 'Excelente post! Adorei o conteúdo e a forma como foi escrito.',
      })
    commentResponse.assertStatus(201)
    const { commentId } = commentResponse.body()

    // 7. autor vê comentários pendentes
    const pendingResponse = await client
      .get(`/api/v1/posts/${postId}/comments/pending`)
      .header('authorization', `Bearer ${authorToken.token}`)

    pendingResponse.assertStatus(200)
    pendingResponse.assertBodyContains([
      { text: 'Excelente post! Adorei o conteúdo e a forma como foi escrito.' },
    ])

    // 8. autor aprova comentário
    const approvalResponse = await client
      .patch(`/api/v1/comments/${commentId}/approval`)
      .header('authorization', `Bearer ${authorToken.token}`)
      .json({ status: 'approved' })
    approvalResponse.assertStatus(200)

    // 9. confere comentário público
    const publicCommentsResponse = await client.get(`/api/v1/posts/${postId}/comments`)
    publicCommentsResponse.assertStatus(200)
    publicCommentsResponse.assertBodyContains([
      {
        text: 'Excelente post! Adorei o conteúdo e a forma como foi escrito.',
        status: 'approved',
      },
    ])

    // 10. comentarista responde ao próprio comentário
    const replyResponse = await client
      .post(`/api/v1/posts/${postId}/comments`)
      .header('authorization', `Bearer ${commenterToken.token}`)
      .json({
        text: 'Esqueci de mencionar que gostei muito das dicas apresentadas!',
        parentId: commentId,
      })
    replyResponse.assertStatus(201)
    const { commentId: replyId } = replyResponse.body()

    // 11. autor aprova resposta
    await client
      .patch(`/api/v1/comments/${replyId}/approval`)
      .header('authorization', `Bearer ${authorToken.token}`)
      .json({ status: 'approved' })

    // 12. confere estrutura de comentários aninhados
    const nestedCommentsResponse = await client.get(`/api/v1/posts/${postId}/comments`)
    nestedCommentsResponse.assertStatus(200)

    const comments = nestedCommentsResponse.body()
    const parentComment = comments.find((c: any) => c.commentId === commentId)
    assert.exists(parentComment)
    assert.isArray(parentComment.replies)
    assert.lengthOf(parentComment.replies, 1)
    assert.equal(parentComment.replies[0].text, 'Esqueci de mencionar que gostei muito das dicas apresentadas!')
  })

  test('fluxo de moderação: comentário ofensivo é rejeitado e deletado', async ({
    client,
    assert,
  }) => {
    // preparação inicial
    const author = await User.create({
      name: 'Autor Moderador',
      email: 'moderador@teste.com',
      password: await hash.make('123456'),
    })

    const troll = await User.create({
      name: 'Usuário Troll',
      email: 'troll@teste.com',
      password: await hash.make('123456'),
    })

    const post = await Post.create({
      title: 'Post Polêmico',
      content: 'Um post que pode gerar comentários ofensivos',
      authorId: author.id,
    })

    const authorToken = (await User.accessTokens.create(author)).value!.release()
    const trollToken = (await User.accessTokens.create(troll)).value!.release()

    // 1. Troll faz comentário ofensivo
    const offensiveCommentResponse = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${trollToken}`)
      .json({
        text: 'Este post é péssimo e o autor não entende nada do assunto!',
      })
    offensiveCommentResponse.assertStatus(201)
    const { commentId } = offensiveCommentResponse.body()

    // 2. Autor vê comentário pendente
    const pendingResponse = await client
      .get(`/api/v1/posts/${post.id}/comments/pending`)
      .header('authorization', `Bearer ${authorToken}`)
    pendingResponse.assertStatus(200)

    // 3. Autor rejeita comentário
    const rejectionResponse = await client
      .patch(`/api/v1/comments/${commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'rejected' })
    rejectionResponse.assertStatus(200)

    // 4. Comentário não aparece na lista pública
    const publicResponse = await client.get(`/api/v1/posts/${post.id}/comments`)
    publicResponse.assertStatus(200)
    publicResponse.assertBodyNotContains(['Este post é péssimo'])

    // 5. Autor decide deletar o comentário definitivamente
    const deleteResponse = await client
      .delete(`/api/v1/comments/${commentId}`)
      .header('authorization', `Bearer ${authorToken}`)
    deleteResponse.assertStatus(204)

    // 6. Verifica soft delete no banco
    const comment = await Comment.find(commentId)
    assert.exists(comment)
    assert.equal(comment!.deleted, true)
  })

  test('fluxo de edição: comentarista edita comentário antes da aprovação', async ({
    client,
  }) => {
    // preparação
    const author = await User.create({
      name: 'Autor',
      email: 'autor@teste.com',
      password: await hash.make('123456'),
    })

    const commenter = await User.create({
      name: 'Comentarista',
      email: 'comentarista@teste.com',
      password: await hash.make('123456'),
    })

    const post = await Post.create({
      title: 'Post Interessante',
      content: 'Conteúdo interessante para comentários',
      authorId: author.id,
    })

    const authorToken = (await User.accessTokens.create(author)).value!.release()
    const commenterToken = (await User.accessTokens.create(commenter)).value!.release()

    // 1. Comentarista cria comentário com erro
    const initialCommentResponse = await client
      .post(`/api/v1/posts/${post.id}/comments`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: 'Muito bom o post! Só acho que poderia ter mais detalhes sobre X.',
      })
    initialCommentResponse.assertStatus(201)
    const { commentId } = initialCommentResponse.body()

    // 2. Comentarista percebe erro e edita antes da aprovação
    const editResponse = await client
      .put(`/api/v1/comments/${commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({
        text: 'Muito bom o post! Só acho que poderia ter mais detalhes sobre o tema Y e suas implicações práticas.',
      })
    editResponse.assertStatus(200)
    editResponse.assertBodyContains({
      status: 'pending', // volta para pending após edição
    })

    // 3. Autor vê comentário editado na lista de pendentes
    const pendingResponse = await client
      .get(`/api/v1/posts/${post.id}/comments/pending`)
      .header('authorization', `Bearer ${authorToken}`)
    pendingResponse.assertStatus(200)
    pendingResponse.assertBodyContains([
      { text: 'Muito bom o post! Só acho que poderia ter mais detalhes sobre o tema Y e suas implicações práticas.' },
    ])

    // 4. Autor aprova comentário editado
    const approvalResponse = await client
      .patch(`/api/v1/comments/${commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'approved' })
    approvalResponse.assertStatus(200)

    // 5. Verifica que comentário editado está público
    const publicResponse = await client.get(`/api/v1/posts/${post.id}/comments`)
    publicResponse.assertStatus(200)
    publicResponse.assertBodyContains([
      { text: 'Muito bom o post! Só acho que poderia ter mais detalhes sobre o tema Y e suas implicações práticas.' },
    ])
  })

  test('fluxo de permissões: diferentes usuários têm diferentes acessos', async ({
    client,
  }) => {
    // preparação: 3 usuários com papéis diferentes
    const author = await User.create({
      name: 'Autor Original',
      email: 'autor@teste.com',
      password: await hash.make('123456'),
    })

    const commenter = await User.create({
      name: 'Comentarista',
      email: 'comentarista@teste.com',
      password: await hash.make('123456'),
    })

    const visitor = await User.create({
      name: 'Visitante',
      email: 'visitante@teste.com',
      password: await hash.make('123456'),
    })

    const post = await Post.create({
      title: 'Post com Permissões',
      content: 'Post para testar diferentes níveis de permissão',
      authorId: author.id,
    })

    const comment = await Comment.create({
      text: 'Comentário para testar permissões',
      status: 'pending',
      postId: post.id,
      authorId: commenter.id,
    })

    const authorToken = (await User.accessTokens.create(author)).value!.release()
    const commenterToken = (await User.accessTokens.create(commenter)).value!.release()
    const visitorToken = (await User.accessTokens.create(visitor)).value!.release()

    // Autor pode: ver pendentes, aprovar, deletar post e comentários
    let response = await client
      .get(`/api/v1/posts/${post.id}/comments/pending`)
      .header('authorization', `Bearer ${authorToken}`)
    response.assertStatus(200) // ok

    response = await client
      .patch(`/api/v1/comments/${comment.commentId}/approval`)
      .header('authorization', `Bearer ${authorToken}`)
      .json({ status: 'approved' })
    response.assertStatus(200) // ok

    response = await client
      .delete(`/api/v1/posts/${post.id}`)
      .header('authorization', `Bearer ${authorToken}`)
    response.assertStatus(204) // ok

    // Recriar post para continuar testes
    const newPost = await Post.create({
      title: 'Novo Post',
      content: 'Novo post para continuar testes',
      authorId: author.id,
    })

    const newComment = await Comment.create({
      text: 'Novo comentário',
      status: 'pending',
      postId: newPost.id,
      authorId: commenter.id,
    })

    // Comentarista pode: editar próprios comentários, deletar próprios
    response = await client
      .put(`/api/v1/comments/${newComment.commentId}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ text: 'Comentário editado pelo próprio autor' })
    response.assertStatus(200) // ok

    // Comentarista NÃO pode: ver pendentes, aprovar, editar post
    response = await client
      .get(`/api/v1/posts/${newPost.id}/comments/pending`)
      .header('authorization', `Bearer ${commenterToken}`)
    response.assertStatus(403) // não pode

    response = await client
      .patch(`/api/v1/comments/${newComment.commentId}/approval`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ status: 'approved' })
    response.assertStatus(403) // não pode

    response = await client
      .put(`/api/v1/posts/${newPost.id}`)
      .header('authorization', `Bearer ${commenterToken}`)
      .json({ title: 'Tentando editar' })
    response.assertStatus(403) // não pode

    // Visitante NÃO pode: fazer nenhuma operação que exige autenticação
    response = await client
      .post(`/api/v1/posts/${newPost.id}/comments`)
      .header('authorization', `Bearer ${visitorToken}`)
      .json({ text: 'Tentativa de comentário' })
    response.assertStatus(201) // ok (pode comentar)

    response = await client
      .put(`/api/v1/comments/${newComment.commentId}`)
      .header('authorization', `Bearer ${visitorToken}`)
      .json({ text: 'Tentando editar comentário alheio' })
    response.assertStatus(403) // não pode
  })
})