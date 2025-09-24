import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  // no modo debug, mostra erros detalhados com stack trace bonito
  protected debug = !app.inProduction

  // método pra tratar erros e retornar resposta pro cliente
  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx)
  }

  // método pra reportar erro pro sistema de log ou
  // serviço de monitoramento
  // IMPORTANTE: não tente enviar resposta daqui
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
