import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'

// arquivo importado pelo executor de testes

// configura os plugins dos testes
export const plugins: Config['plugins'] = [assert(), apiClient(), pluginAdonisJS(app)]

// funções que rodam antes e depois de todos os testes
//
// setup: roda antes dos testes
// teardown: roda depois dos testes
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

// configura as suítes de teste
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
