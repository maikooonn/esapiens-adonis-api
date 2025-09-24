# ESapiens API - AdonisJS

API desenvolvida em AdonisJS com TypeScript para o sistema ESapiens.

## 🚀 Tecnologias

- [AdonisJS 6](https://adonisjs.com) - Framework web para Node.js
- [TypeScript](https://www.typescriptlang.org) - Superset JavaScript com tipagem estática
- [PostgreSQL](https://www.postgresql.org) - Banco de dados relacional
- [Lucid ORM](https://lucid.adonisjs.com) - ORM oficial do AdonisJS

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- PostgreSQL
- npm ou yarn

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

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=esapiens-api
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
- `npm test` - Executa os testes
- `npm run lint` - Executa o linter
- `npm run format` - Formata o código
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

## 🔗 Endpoints principais

```
GET    /                 # Health check
GET    /api/users        # Lista usuários
POST   /api/users        # Cria usuário
GET    /api/users/:id    # Busca usuário por ID
PUT    /api/users/:id    # Atualiza usuário
DELETE /api/users/:id    # Remove usuário
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

Execute os testes com:

```bash
npm test
```

## 📈 Monitoramento

- Logs são salvos conforme configuração em `config/logger.ts`
- Level de log configurável via variável `LOG_LEVEL`

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.
