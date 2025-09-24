# ESapiens API - AdonisJS

API desenvolvida em AdonisJS com TypeScript para o sistema ESapiens, incluindo um sistema completo de comentários com moderação e hierarquia.

## 🚀 Tecnologias

- [AdonisJS 6](https://adonisjs.com) - Framework web para Node.js
- [TypeScript](https://www.typescriptlang.org) - Superset JavaScript com tipagem estática
- [PostgreSQL](https://www.postgresql.org) - Banco de dados relacional (produção)
- [SQLite](https://www.sqlite.org) - Banco de dados para testes
- [Lucid ORM](https://lucid.adonisjs.com) - ORM oficial do AdonisJS
- [Japa](https://japa.dev) - Framework de testes
- [ESLint](https://eslint.org) + [Prettier](https://prettier.io) - Qualidade de código

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- PostgreSQL (para produção)
- SQLite (incluído para testes)
- npm ou yarn

## ✨ Funcionalidades

### Sistema de Usuários
- Cadastro e autenticação com JWT
- Perfis de usuário com validações
- Controle de acesso baseado em roles

### Sistema de Posts
- Criação, edição e exclusão de posts
- Associação com autor
- Validações de conteúdo

### Sistema de Comentários Avançado
- **Comentários hierárquicos**: Suporte a respostas aninhadas
- **Sistema de moderação**: Aprovação/rejeição pelo autor do post
- **Estados dos comentários**: pending, approved, rejected
- **Soft delete**: Comentários deletados são mantidos no banco
- **Validações**: Limite de 1024 caracteres por comentário
- **Permissões granulares**: Comentaristas só podem editar próprios comentários pending
- **Autenticação obrigatória**: Todas operações CUD exigem login

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone <url-do-repositorio>
cd esapiens-adonis
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações:

```env
NODE_ENV=development
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=your-app-key-here

# Banco de dados (PostgreSQL para produção)
DB_CONNECTION=pg
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=esapiens-api

# Para testes, o SQLite é configurado automaticamente
```

5. Execute as migrações do banco de dados:

```bash
node ace migration:run
```

## 🚀 Executando a aplicação

### Desenvolvimento

```bash
npm run dev
```

Inicia o servidor em modo de desenvolvimento com hot reload na porta 3333.

### Produção

```bash
# Build da aplicação
npm run build

# Iniciar servidor
npm start
```

## 🛠️ Scripts disponíveis

- `npm run dev` - Inicia em modo desenvolvimento com hot reload
- `npm run build` - Compila o projeto TypeScript
- `npm start` - Inicia o servidor em produção
- `npm test` - Executa todos os testes funcionais
- `npm run lint` - Executa o linter ESLint
- `npm run format` - Formata o código com Prettier
- `npm run typecheck` - Verifica os tipos TypeScript

## 📁 Estrutura do projeto

```
esapiens-adonis/
├── app/
│   ├── controllers/     # Controllers da aplicação
│   ├── middleware/      # Middlewares
│   ├── models/          # Modelos do banco de dados
│   ├── services/        # Serviços de negócio
│   └── validators/      # Validadores de entrada
├── bin/                 # Scripts de inicialização
├── config/              # Arquivos de configuração
├── database/
│   ├── migrations/      # Migrações do banco
│   └── seeders/         # Seeders
├── start/               # Arquivos de inicialização
├── tests/               # Testes da aplicação
└── build/               # Arquivos compilados
```

## 🔗 API Endpoints

### Health Check
```
GET    /                 # Informações da API
```

### Autenticação
```
POST   /api/v1/auth/login    # Login (obtém token JWT)
POST   /api/v1/auth/logout   # Logout
```

### Usuários
```
GET    /api/v1/users         # Lista usuários
POST   /api/v1/users         # Cria usuário (público)
GET    /api/v1/users/:id     # Busca usuário por ID
PUT    /api/v1/users/:id     # Atualiza usuário (autenticado)
DELETE /api/v1/users/:id     # Remove usuário (autenticado)
```

### Posts
```
GET    /api/v1/posts         # Lista posts
POST   /api/v1/posts         # Cria post (autenticado)
GET    /api/v1/posts/:id     # Busca post por ID
PUT    /api/v1/posts/:id     # Atualiza post (autor apenas)
DELETE /api/v1/posts/:id     # Remove post (autor apenas)
```

### Comentários
```
# Comentários públicos (aprovados)
GET    /api/v1/posts/:id/comments              # Lista comentários aprovados

# Comentários pendentes (autor do post apenas)
GET    /api/v1/posts/:id/comments/pending      # Lista comentários pendentes

# Operações de comentário (autenticados)
POST   /api/v1/posts/:id/comments              # Cria comentário/resposta
PUT    /api/v1/comments/:id                    # Edita comentário (autor, apenas se pending)
DELETE /api/v1/comments/:id                    # Remove comentário (autor ou dono do post)

# Moderação (autor do post apenas)
PATCH  /api/v1/comments/:id/approval           # Aprova/rejeita comentário
```

## 📝 Desenvolvimento

### Adicionando novas rotas

As rotas são definidas em `start/routes.ts`.

### Criando controllers

```bash
node ace make:controller User
```

### Criando models

```bash
node ace make:model User
```

### Criando migrações

```bash
node ace make:migration create_users_table
```

## 🧪 Testes

A aplicação possui uma suíte completa de testes funcionais que cobrem:

- **Testes de usuários** (`users.spec.ts`): CRUD de usuários, validações, autenticação
- **Testes de posts** (`posts.spec.ts`): CRUD de posts, autorização, relacionamentos
- **Testes de comentários** (`comments.spec.ts`): Sistema completo de comentários e moderação
- **Testes de integração** (`integration.spec.ts`): Fluxos completos end-to-end
- **Regras de negócio** (`business_rules.spec.ts`): Validação das regras específicas
- **Health check** (`health.spec.ts`): Verificação básica da API

Execute todos os testes:

```bash
npm test
```

Execute testes específicos:

```bash
# Apenas testes de comentários
npm test -- --files="tests/functional/comments.spec.ts"

# Apenas testes de integração
npm test -- --files="tests/functional/integration.spec.ts"
```

### Cobertura de Testes

Os testes cobrem:
- ✅ Autenticação e autorização
- ✅ Validações de entrada
- ✅ Regras de negócio específicas
- ✅ Relacionamentos entre modelos
- ✅ Estados de comentários (pending/approved/rejected)
- ✅ Soft delete e permissões
- ✅ Fluxos de moderação completos

## 🔐 Autenticação e Segurança

### Sistema de Tokens JWT
- Autenticação via Bearer tokens
- Tokens gerenciados pelo AdonisJS Access Tokens
- Expiração configurável por ambiente

### Controle de Acesso
- **Rotas públicas**: Lista de usuários/posts, visualização de comentários aprovados
- **Rotas autenticadas**: Criação de posts/comentários, operações em recursos próprios
- **Moderação**: Apenas autores de posts podem aprovar/rejeitar comentários

### Validações
- Todos endpoints possuem validação de entrada
- IDs numericos validados adequadamente
- Textos com limites de tamanho apropriados

## 🎯 Regras de Negócio

### Sistema de Comentários
1. **Criação**: Todos comentários iniciam com status `pending`
2. **Moderação**: Apenas o autor do post pode aprovar/rejeitar
3. **Edição**: Comentários só podem ser editados pelo autor e apenas se `pending`
4. **Hierarquia**: Comentários podem ter respostas (parentId)
5. **Limite**: Máximo de 1024 caracteres por comentário
6. **Soft Delete**: Comentários deletados são mantidos no banco com flag `deleted`

### Permissões
- Usuários podem editar apenas seus próprios dados
- Posts podem ser editados apenas pelo autor
- Comentários: autor pode editar (se pending), autor do post pode moderar
- Deleção: comentários podem ser deletados pelo autor ou dono do post

## 📈 Monitoramento

- Logs configuráveis via `LOG_LEVEL` (debug, info, warn, error)
- Estrutura de logs padronizada
- Suporte a diferentes transports
