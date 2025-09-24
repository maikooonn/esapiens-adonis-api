/*
|--------------------------------------------------------------------------
| Inicialização do servidor HTTP
|--------------------------------------------------------------------------
|
| Aqui é onde o servidor AdonisJS começa. Você pode rodar este arquivo
| diretamente ou usar o comando "serve" pra rodar e monitorar mudanças
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

// caminho raiz da aplicação - o AdonisJS precisa disso
// pra resolver os caminhos dos arquivos e pastas
const APP_ROOT = new URL('../', import.meta.url)

// função que importa arquivos no contexto da aplicação
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
