import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  // métodos HTTP que terão o body parseado
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  // config pra form-urlencoded
  form: {
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },

  // config pra JSON
  json: {
    convertEmptyStringsToNull: true,
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  // config pra multipart (upload de arquivos)
  multipart: {
    // move arquivos pra pasta tmp automaticamente
    autoProcess: true,
    convertEmptyStringsToNull: true,
    processManually: [],

    // limite máximo de dados (arquivos + campos)
    limit: '20mb',
    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
