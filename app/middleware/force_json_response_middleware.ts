import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

// atualiza o header "Accept" pra sempre aceitar resposta "application/json"
// do servidor. Força os internals do framework (erros de validação, auth, etc)
// a retornarem resposta JSON
export default class ForceJsonResponseMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const headers = request.headers()
    headers.accept = 'application/json'

    return next()
  }
}
