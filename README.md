<div align="center">
  <img src="public/logo.png" alt="Pedido Fácil" width="220" />

  <h1>Pedido Fácil</h1>

  <p>
    Sistema de gestão de pedidos com cardápio digital para pequenos negócios de comida.
    Cada loja tem seu próprio painel administrativo e seu cardápio público acessível por um link.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

---

## Sobre o projeto

O **Pedido Fácil** é uma aplicação web pensada para lanchonetes, hamburguerias e
outros pequenos negócios que precisam receber pedidos online sem depender de
marketplaces.

O dono da loja cria sua conta, configura a loja e monta o cardápio. A partir daí,
o estabelecimento ganha duas áreas:

- **Painel administrativo** (`/dashboard`) — gerenciar loja, cardápio e a fila de pedidos.
- **Cardápio público** (`/:slug`) — página que o cliente final acessa para escolher
  itens, montar o carrinho e enviar o pedido.

Cada loja funciona de forma isolada: os dados são sempre filtrados pelo `store_id`
do usuário autenticado, então uma loja nunca enxerga o cardápio ou os pedidos de outra.

## Funcionalidades

### Para o dono da loja

- Cadastro e login com senha protegida por hash (bcrypt) e sessão via JWT.
- Criação da loja com nome, link personalizado (slug), WhatsApp e taxa de entrega.
- Abertura e fechamento da loja com um clique no painel.
- Criação de categorias do cardápio.
- Cadastro de produtos com nome, descrição, preço e imagem.
- Acompanhamento dos pedidos com atualização automática a cada 15 segundos.
- Alteração do andamento do pedido, com botões de ação conforme o status atual.

### Para o cliente

- Cardápio público no endereço `/:slug`, sem necessidade de login.
- Filtro de produtos por categoria.
- Carrinho com controle de quantidade e cálculo de subtotal, taxa de entrega e total.
- Checkout com nome, telefone, tipo de entrega (entrega ou retirada), endereço,
  forma de pagamento (PIX, cartão na entrega ou dinheiro) e observações.
- Confirmação do pedido com número do pedido na tela.

## Fluxo de uso

```text
Dono da loja                        Cliente
     │                                 │
     ├─ /register  ─── cria conta      │
     ├─ /login     ─── entra           │
     ├─ /dashboard ─── cria a loja     │
     ├─ /dashboard/menu ── categorias  │
     │                  e produtos     │
     │                                 ├─ /:slug ─── vê o cardápio
     │                                 ├─ carrinho ── escolhe itens
     │                                 └─ checkout ── envia o pedido
     │                                 │
     ├─ /dashboard/orders ── recebe e atualiza o status ◄──┘
```

### Status do pedido

| Status             | Rótulo na interface | Próximas ações disponíveis          |
| ------------------ | ------------------- | ----------------------------------- |
| `pending`          | Pendente            | Iniciar preparo · Cancelar          |
| `preparing`        | Em Preparo          | Saiu para entrega / Concluir retirada |
| `out_for_delivery` | Saiu p/ Entrega     | Concluir                            |
| `delivered`        | Concluído           | —                                   |
| `canceled`         | Cancelado           | —                                   |

## Stack

| Camada        | Tecnologia                                        |
| ------------- | ------------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router)     |
| UI            | React 19 + Tailwind CSS 4                         |
| Banco         | PostgreSQL 16 (driver `pg`)                       |
| Autenticação  | JWT (`jsonwebtoken`) + `bcryptjs`                 |
| Infra local   | Docker Compose                                    |

## Estrutura do projeto

```text
.
├── docker-compose.yml       # PostgreSQL local + carga do init.sql
├── init.sql                 # Schema do banco (users, stores, products, orders...)
├── src/
│   ├── middleware.js        # Protege /dashboard/* exigindo o cookie de sessão
│   ├── lib/
│   │   ├── db.js            # Pool de conexões do PostgreSQL
│   │   └── auth.js          # Assinatura e verificação do JWT
│   └── app/
│       ├── page.js          # Página inicial
│       ├── login/           # Tela de login
│       ├── register/        # Tela de cadastro
│       ├── dashboard/       # Painel administrativo (protegido)
│       │   ├── page.js      # Visão geral e configuração da loja
│       │   ├── menu/        # Gerenciamento de categorias e produtos
│       │   └── orders/      # Fila de pedidos
│       ├── [slug]/          # Cardápio público da loja
│       ├── components/
│       │   └── StoreMenu.js # Cardápio + carrinho + checkout (client component)
│       └── api/             # Rotas de API (Route Handlers)
```

## Rotas

### Páginas

| Rota                | Acesso    | Descrição                                            |
| ------------------- | --------- | ---------------------------------------------------- |
| `/`                 | Público   | Página inicial                                       |
| `/login`            | Público   | Formulário de login                                  |
| `/register`         | Público   | Formulário de cadastro do dono da loja               |
| `/dashboard`        | Protegido | Criação da loja, resumo e atalhos                    |
| `/dashboard/orders` | Protegido | Pedidos em andamento e concluídos/cancelados         |
| `/dashboard/menu`   | Protegido | Criação de categorias e cadastro de produtos         |
| `/[slug]`           | Público   | Cardápio digital da loja + carrinho + checkout       |

O `middleware.js` redireciona para `/login` qualquer acesso a `/dashboard/*` sem o
cookie `token`.

### API

| Método  | Rota                | Autenticação | Descrição                                              |
| ------- | ------------------- | ------------ | ------------------------------------------------------ |
| `POST`  | `/api/auth/register`| Pública      | Cria o usuário (valida e-mail único e senha ≥ 6)       |
| `POST`  | `/api/auth/login`   | Pública      | Valida as credenciais e grava o JWT em cookie httpOnly |
| `GET`   | `/api/stores`       | JWT          | Retorna a loja do usuário (ou `null`)                  |
| `POST`  | `/api/stores`       | JWT          | Cria a loja (uma por usuário, slug único)              |
| `PATCH` | `/api/stores`       | JWT          | Abre ou fecha a loja (`is_open`)                       |
| `GET`   | `/api/categories`   | JWT          | Lista as categorias da loja                            |
| `POST`  | `/api/categories`   | JWT          | Cria uma categoria                                     |
| `GET`   | `/api/products`     | JWT          | Lista os produtos da loja com o nome da categoria      |
| `POST`  | `/api/products`     | JWT          | Cadastra um produto (valida categoria e preço)         |
| `GET`   | `/api/orders`       | JWT          | Lista os pedidos da loja com seus itens                |
| `POST`  | `/api/orders`       | Pública      | Recebe o pedido do cardápio público                    |
| `PATCH` | `/api/orders/[id]`  | JWT          | Atualiza o status de um pedido da loja                 |

Os preços nunca vêm do navegador: ao criar um pedido, a API busca os produtos
disponíveis no banco, recalcula subtotal, taxa de entrega (somente em `delivery`)
e total, e só então grava o pedido e seus itens.

## Banco de dados

O schema fica em [`init.sql`](init.sql) e é carregado automaticamente pelo
container na primeira inicialização.

| Tabela        | Papel                                                            |
| ------------- | ---------------------------------------------------------------- |
| `users`       | Donos das lojas (nome, e-mail único, hash da senha)              |
| `stores`      | Lojas, com slug único, WhatsApp, taxa de entrega e `is_open`     |
| `store_hours` | Horários de funcionamento por dia da semana                      |
| `categories`  | Categorias do cardápio, vinculadas a uma loja                    |
| `products`    | Itens do cardápio, com preço, imagem e flag `available`          |
| `orders`      | Pedidos com cliente, entrega, pagamento, valores e status        |
| `order_items` | Itens de cada pedido, com nome e preço registrados no momento    |

## Como rodar

### Pré-requisitos

- Node.js 20 ou superior
- Docker e Docker Compose (para o PostgreSQL local) — ou um PostgreSQL já instalado

### 1. Suba o banco

```bash
docker compose up -d
```

Isso cria o banco `pedido_facil` em `localhost:5432` e executa o `init.sql`.

> O script de inicialização só roda quando o volume está vazio. Se precisar
> recriar o banco do zero, use `docker compose down -v` e suba novamente.

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```dotenv
DATABASE_URL=postgresql://admin:admin123@localhost:5432/pedido_facil
JWT_SECRET=troque-por-uma-chave-secreta-forte
```

| Variável       | Descrição                                              |
| -------------- | ------------------------------------------------------ |
| `DATABASE_URL` | String de conexão usada pelo pool do PostgreSQL        |
| `JWT_SECRET`   | Chave usada para assinar e verificar os tokens de sessão |

### 3. Instale as dependências e rode o projeto

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Scripts

| Comando         | O que faz                            |
| --------------- | ------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a build de produção             |
| `npm start`     | Sobe a build de produção             |
| `npm run lint`  | Roda o ESLint                        |

## Segurança

- Senhas são armazenadas como hash bcrypt (custo 10), nunca em texto puro.
- A sessão fica em um cookie `httpOnly` com validade de 7 dias.
- As rotas de API do painel validam o JWT antes de qualquer consulta.
- Todas as consultas usam parâmetros (`$1`, `$2`, ...), evitando SQL injection.
- As operações são sempre limitadas à loja do usuário autenticado (`store_id`
  derivado do token), impedindo acesso cruzado entre lojas.

> Para produção, vale reforçar: use `secure: true` no cookie, defina um
> `JWT_SECRET` forte e sirva a aplicação atrás de HTTPS.

## Próximos passos

Itens que já existem na estrutura mas ainda não estão completos:

- A página inicial (`/`) ainda é o template padrão do `create-next-app`.
- A tabela `store_hours` está no schema, mas o cálculo de horário de
  funcionamento ainda não é usado pela aplicação.
- O status `is_open` não bloqueia novos pedidos no cardápio público.
- A lista de pedidos usa polling a cada 15 segundos (sem WebSocket/SSE).
- Ainda não há edição ou remoção de categorias e produtos pela interface.
- Sem testes automatizados configurados no momento.

---

Feito com Next.js, PostgreSQL e Tailwind CSS.
