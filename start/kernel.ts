/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

// manipula os erros e converte pra resposta HTTP
server.errorHandler(() => import('#exceptions/handler'))

// middlewares que rodam em todas as requisições HTTP,
// mesmo se não tem rota registrada
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('#middleware/force_json_response_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

// middlewares que rodam apenas em requisições
// que têm uma rota registrada
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

// middlewares nomeados que precisam ser atribuídos
// manualmente às rotas ou grupos de rotas
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})
