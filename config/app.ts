import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

// chave da app pra criptografar cookies e URLs assinadas
// IMPORTANTE: guarde bem essa chave!
export const appKey = new Secret(env.get('APP_KEY'))

// configurações do servidor HTTP
export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,

  // habilita acesso ao contexto HTTP de qualquer lugar da app
  useAsyncLocalStorage: false,

  // configuração dos cookies
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
