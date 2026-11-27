<div align="center">
  <img src="public/logo.png" alt="Pedido Fácil" width="220" />

  <h1>Pedido Fácil</h1>

  <p>
    Sistema completo de gestão de pedidos com cardápio digital para pequenos negócios de comida.
    Cada estabelecimento possui seu próprio painel administrativo com métricas e cardápio público exclusivo acessível via link direto.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma_ORM-7-2D3748?logo=prisma&logoColor=white" alt="Prisma ORM" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

---

## 📖 Sobre o projeto

O **Pedido Fácil** é uma plataforma web desenvolvida para lanchonetes, hamburguerias, pizzarias e pequenos negócios gastronômicos que desejam receber pedidos online de forma direta, sem pagar comissões por venda a marketplaces de terceiros.

O sistema divide-se em três partes principais:

- **Landing Page Institucional** (`/`) — apresentação da proposta de valor, como funciona o sistema e chamadas para criação de conta ou acesso ao painel.
- **Painel Administrativo** (`/dashboard`) — ambiente protegido para o lojista configurar sua loja, acompanhar métricas diárias (faturamento, ticket médio e pedidos ativos), gerenciar categorias e produtos (com pausa, edição e exclusão segura) e operar a fila de pedidos da cozinha.
- **Cardápio Digital Público** (`/:slug`) — vitrine online responsiva e rápida onde o cliente consulta itens por categoria, monta seu carrinho com cálculo em tempo real e fecha pedidos via entrega ou retirada.

A arquitetura adota modelo multi-tenant por estabelecimento: todos os dados de categorias, produtos e pedidos são isolados pelo `store_id` associado ao lojista autenticado.

---

## ✨ Funcionalidades

### 🏪 Para o Dono da Loja (Painel Administrativo)

- **Autenticação Segura:** Cadastro e login com senha criptografada via `bcrypt` e persistência de sessão em cookie `httpOnly` seguro via JWT.
- **Configuração da Loja:** Criação e personalização da loja com nome, link amigável exclusivo (`slug`), telefone/WhatsApp de contato e taxa de entrega padrão.
- **Abertura / Fechamento com 1 Clique:** Alterne instantaneamente entre "Loja Aberta" e "Loja Fechada", bloqueando novos pedidos quando fora do expediente.
- **Métricas em Tempo Real no Dashboard:**
  - Total faturado no dia (pedidos entregues/concluídos).
  - Quantidade de pedidos entregues hoje e cálculo automático do **Ticket Médio**.
  - Total de pedidos atualmente na fila de produção.
  - Botão com cópia rápida do link público da loja para compartilhar no WhatsApp ou Instagram.
- **Gestão do Cardápio (`/dashboard/menu`):**
  - Criação e listagem de categorias de produtos.
  - Cadastro de produtos com nome, descrição, categoria, preço e URL de foto.
  - **Edição de produtos** com modal integrado para ajustar dados e preços rapidamente.
  - **Pausa de itens esgotados** (`available: false`), ocultando-os instantaneamente do cardápio público sem perder o registro.
  - **Exclusão inteligente com proteção de integridade:** produtos que já possuem pedidos no histórico são protegidos contra exclusão física acidental, oferecendo a opção de pausá-los.
- **Gestão Operacional de Pedidos (`/dashboard/orders`):**
  - Fila da cozinha com atualização automática via polling a cada 15 segundos ou botão manual de atualização.
  - Divisão visual por abas: **Em Andamento** vs. **Concluídos / Cancelados**.
  - Identificação destacada de **Entrega** (com endereço completo) ou **Retirada no Balcão**.
  - Ações de transição de status conforme o fluxo da cozinha (`Aceitar e Preparar`, `Saiu para Entrega`, `Confirmar Entrega` ou `Cancelar`).

### 📱 Para o Cliente Final (Cardápio Público)

- **Acesso direto sem necessidade de cadastro ou aplicativo:** basta abrir o link `/:slug` no navegador do celular ou computador.
- **Status da loja visível:** indicação clara se a loja está aberta ou fechada; lojas fechadas desabilitam a inserção no carrinho e a finalização de compras.
- **Navegação fluida no cardápio:** filtro rápido por categorias e fotos com fallback automático caso a imagem não carregue.
- **Carrinho de Compras Interativo:** controle de quantidades (+/-), cálculo dinâmico de subtotal, frete e valor final.
- **Checkout Completo:**
  - Escolha entre **Entrega** ou **Retirada no Balcão**.
  - Dados do cliente (nome e telefone de contato).
  - Endereço de entrega (obrigatório se modalidade de entrega).
  - Métodos de pagamento: **PIX**, **Cartão de Crédito/Débito** ou **Dinheiro**.
  - Campo aberto para observações do pedido (ex: "sem cebola", "ponto da carne").
  - Tela de confirmação com número do pedido gerado.

---

## 🔄 Fluxo de Operação

```text
               DONO DA LOJA                                    CLIENTE
                    │                                             │
      ┌─────────────┴─────────────┐                               │
      │ 1. Cria conta (/register) │                               │
      │ 2. Entra (/login)         │                               │
      │ 3. Configura loja         │                               │
      │ 4. Cadastra categorias    │                               │
      │    e produtos no cardápio │                               │
      └─────────────┬─────────────┘                               │
                    │                                             │
                    ├────────── Compartilha o link ──────────────►│ (ex: pedidofacil.com/minha-loja)
                    │                                             │
                    │                                 ┌───────────┴───────────┐
                    │                                 │ Acessa cardápio       │
                    │                                 │ Monta o carrinho      │
                    │                                 │ Informa endereço/obs  │
                    │                                 │ Finaliza o pedido     │
                    │                                 └───────────┬───────────┘
                    │                                             │
      ┌─────────────┴─────────────┐                               │
      │ Recebe o pedido na fila   │◄──────────────────────────────┘
      │ de /dashboard/orders      │
      │ (atualiza a cada 15s)     │
      │                           │
      │ Avança status:            │
      │ Pendente ➔ Em Preparo     │
      │ ➔ Saiu p/ Entrega         │
      │ ➔ Concluído               │
      └───────────────────────────┘
```

### Ciclo de Vida do Pedido

| Status             | Rótulo na Interface | Próximas Ações Disponíveis            |
| ------------------ | ------------------- | ------------------------------------- |
| `pending`          | Pendente            | Aceitar e Preparar · Cancelar         |
| `preparing`        | Em Preparo          | Saiu para Entrega / Concluir Retirada |
| `out_for_delivery` | Saiu p/ Entrega     | Confirmar Entrega                     |
| `delivered`        | Concluído           | —                                     |
| `canceled`         | Cancelado           | —                                     |

---

## 🛠️ Tecnologias Utilizadas

| Camada            | Tecnologia                                                        |
| ----------------- | ----------------------------------------------------------------- |
| **Framework Web** | [Next.js 16](https://nextjs.org) (App Router com Route Handlers)  |
| **Linguagem & UI**| React 19 + [Tailwind CSS 4](https://tailwindcss.com)              |
| **ORM**           | [Prisma ORM 7](https://www.prisma.io) (`@prisma/client`)          |
| **Driver Adapter**| `@prisma/adapter-pg` + `pg` (PostgreSQL Driver)                   |
| **Banco de Dados**| PostgreSQL 16 (container Docker ou instância dedicada)            |
| **Autenticação**  | JWT (`jsonwebtoken`) assinado com chave secreta + `bcryptjs`      |
| **Contêineres**   | Docker & Docker Compose                                           |

---

## 📁 Estrutura de Pastas

```text
.
├── docker-compose.yml         # Definição do serviço PostgreSQL para desenvolvimento
├── init.sql                   # Script DDL inicial com tabelas e relacionamentos
├── prisma.config.ts           # Configuração do Prisma ORM 7 (schema, migrations, url)
├── prisma/
│   └── schema.prisma          # Modelagem declarativa do banco de dados (Prisma Client)
├── public/                    # Ativos públicos e estáticos (logo, favicon)
├── src/
│   ├── middleware.js          # Middleware de proteção de rotas privadas (/dashboard/*)
│   ├── lib/
│   │   ├── auth.js            # Funções de assinatura e validação do token JWT
│   │   └── db.js              # Inicialização do PrismaClient singleton com adapter-pg
│   ├── generated/
│   │   └── prisma/            # Saída do cliente tipado gerado pelo Prisma
│   └── app/
│       ├── layout.js          # Root layout da aplicação
│       ├── globals.css        # Importações e utilitários globais do Tailwind CSS 4
│       ├── page.js            # Landing page institucional do Pedido Fácil
│       ├── login/             # Página pública de autenticação
│       ├── register/          # Página pública de cadastro de novos lojistas
│       ├── [slug]/            # Página dinâmica pública do cardápio do estabelecimento
│       ├── components/
│       │   └── StoreMenu.js   # Componente interativo do cardápio, carrinho e checkout
│       ├── dashboard/         # Módulos restritos ao lojista autenticado
│       │   ├── page.js        # Visão geral, configuração da loja e métricas do dia
│       │   ├── menu/          # Gestão de categorias e produtos (criar, editar, pausar, excluir)
│       │   └── orders/        # Fila de pedidos da cozinha com polling automático
│       └── api/               # API RESTful interna (Route Handlers)
│           ├── auth/
│           │   ├── login/     # POST: autenticação e geração de cookie JWT
│           │   └── register/  # POST: criação de usuário lojista
│           ├── stores/        # GET, POST, PATCH (abrir/fechar loja)
│           ├── categories/    # GET, POST
│           ├── products/      # GET, POST
│           │   └── [id]/      # PATCH (edição e disponibilidade), DELETE (exclusão segura)
│           └── orders/        # GET (lojista), POST (checkout público)
│               └── [id]/      # PATCH: transição de status do pedido
```

---

## 🔌 Rotas da Aplicação

### 🌐 Páginas (App Router)

| Rota                | Nível de Acesso | Descrição                                                       |
| ------------------- | --------------- | ---------------------------------------------------------------- |
| `/`                 | Público         | Landing page com proposta de valor e apresentação da plataforma |
| `/login`            | Público         | Formulário de entrada para donos de lojas                        |
| `/register`         | Público         | Formulário de cadastro de conta de lojista                       |
| `/dashboard`        | **Protegido**   | Visão geral, métricas de vendas do dia e status de funcionamento |
| `/dashboard/menu`   | **Protegido**   | Gerenciamento completo de categorias e produtos                  |
| `/dashboard/orders` | **Protegido**   | Fila de pedidos para controle da cozinha e despacho             |
| `/[slug]`           | Público         | Vitrine digital da loja, catálogo de produtos e checkout        |

> O [`middleware.js`](src/middleware.js) intercepta automaticamente qualquer rota iniciada por `/dashboard` e redireciona para `/login` caso o cookie `token` não esteja presente.

---

### 📡 Rotas de API (Endpoints)

| Método   | Endpoint                  | Acesso        | Descrição                                                                               |
| -------- | ------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `POST`   | `/api/auth/register`      | Público       | Registra um novo usuário (valida e-mail único e senha mínima de 6 caracteres).           |
| `POST`   | `/api/auth/login`         | Público       | Autentica credenciais e define o cookie HTTP-only `token` (validade de 7 dias).          |
| `GET`    | `/api/stores`             | Autenticado   | Retorna as informações da loja do usuário logado (ou `null` caso ainda não configurada). |
| `POST`   | `/api/stores`             | Autenticado   | Cria a loja associada à conta (garante 1 loja por lojista e `slug` exclusivo).           |
| `PATCH`  | `/api/stores`             | Autenticado   | Alterna o status da loja entre aberta e fechada (`is_open: true/false`).                |
| `GET`    | `/api/categories`         | Autenticado   | Lista todas as categorias cadastradas na loja do usuário autenticado.                   |
| `POST`   | `/api/categories`         | Autenticado   | Adiciona uma nova categoria ao cardápio da loja.                                        |
| `GET`    | `/api/products`           | Autenticado   | Lista todos os produtos da loja com categoria e indicador de pedidos vinculados.        |
| `POST`   | `/api/products`           | Autenticado   | Cadastra um novo produto (nome, categoria, preço, descrição e foto).                     |
| `PATCH`  | `/api/products/[id]`      | Autenticado   | Atualiza dados do produto ou alterna sua disponibilidade (`available`).                 |
| `DELETE` | `/api/products/[id]`      | Autenticado   | Remove um produto (bloqueado com código `409` caso existam pedidos associados ao item). |
| `GET`    | `/api/orders`             | Autenticado   | Lista todos os pedidos recebidos pela loja acompanhados de seus itens.                   |
| `POST`   | `/api/orders`             | Público       | Cria um novo pedido a partir do cardápio público (recalcula totais no backend).         |
| `PATCH`  | `/api/orders/[id]`        | Autenticado   | Atualiza o status do pedido na esteira de produção da loja.                             |

---

## 🗄️ Modelagem do Banco de Dados

O banco de dados é modelado e manipulado pelo **Prisma ORM** através do arquivo [`prisma/schema.prisma`](prisma/schema.prisma).

```mermaid
erDiagram
    users ||--o{ stores : "possui"
    stores ||--o{ categories : "possui"
    stores ||--o{ products : "possui"
    stores ||--o{ orders : "recebe"
    stores ||--o{ store_hours : "define"
    categories ||--o{ products : "agrupa"
    orders ||--o{ order_items : "contém"
    products ||--o{ order_items : "referenciado"

    users {
        int id PK
        string name
        string email UK
        string password_hash
        datetime created_at
    }

    stores {
        int id PK
        int user_id FK
        string name
        string slug UK
        string phone
        decimal delivery_fee
        boolean is_open
        datetime created_at
    }

    categories {
        int id PK
        int store_id FK
        string name
        datetime created_at
    }

    products {
        int id PK
        int store_id FK
        int category_id FK
        string name
        string description
        decimal price
        string image_url
        boolean available
        datetime created_at
    }

    orders {
        int id PK
        int store_id FK
        string customer_name
        string customer_phone
        string delivery_type
        string address
        string payment_method
        string notes
        decimal subtotal
        decimal delivery_fee
        decimal total
        string status
        datetime created_at
    }

    order_items {
        int id PK
        int order_id FK
        int product_id FK
        string product_name
        decimal unit_price
        int quantity
    }
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) versão 20 ou superior
- [Docker](https://www.docker.com/) e Docker Compose (para o PostgreSQL local)
- Gerenciador de pacotes `npm`

---

### Passo 1: Iniciar o Banco de Dados

Suba a instância do PostgreSQL via Docker Compose:

```bash
docker compose up -d
```

O container inicializará o banco de dados `pedido_facil` na porta `5432` e executará o script [`init.sql`](init.sql) na primeira carga do volume.

> **Dica:** Se precisar limpar e recriar o banco do zero:
> ```bash
> docker compose down -v
> docker compose up -d
> ```

---

### Passo 2: Configurar as Variáveis de Ambiente

Crie o arquivo `.env` a partir do modelo de exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```dotenv
# String de conexão do PostgreSQL
DATABASE_URL="postgresql://admin:admin123@localhost:5432/pedido_facil?schema=public"

# Chave secreta para assinatura dos tokens JWT
JWT_SECRET="troque-por-uma-chave-secreta-forte-e-aleatoria"
```

---

### Passo 3: Instalar Dependências e Gerar o Prisma Client

Instale as dependências (o script `postinstall` gera o Prisma Client automaticamente):

```bash
npm install
```

Caso queira regenerar manualmente os artefatos do Prisma a qualquer momento:

```bash
npx prisma generate
```

---

### Passo 4: Executar a Aplicação

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra o navegador em: [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts do `package.json`

| Comando            | Descrição                                                         |
| ------------------ | ----------------------------------------------------------------- |
| `npm run dev`      | Inicia o servidor Next.js em ambiente de desenvolvimento         |
| `npm run build`    | Gera o cliente do Prisma e compila o projeto para produção        |
| `npm run start`    | Inicia a aplicação já compilada em modo de produção               |
| `npm run lint`     | Executa a análise estática de código com o ESLint                 |
| `npm run postinstall` | Executado após instalação das dependências (`prisma generate`) |

---

## 🔒 Regras de Negócio e Segurança

1. **Preços Confiáveis (Imutabilidade pelo Cliente):** Os preços nunca são aceitos a partir do cliente/navegador. No ato do checkout, a API busca os produtos no banco via seus IDs, valida a disponibilidade e calcula subtotal, taxa de entrega e valor total no servidor.
2. **Bloqueio de Pedidos Fora do Horário:** Caso a loja esteja fechada (`is_open = false`), a API rejeita qualquer tentativa de pedido antes de gravar no banco.
3. **Integridade de Histórico de Vendas:** Produtos associados a pedidos anteriores não podem ser apagados do banco de dados (exclusão física) para não comprometer relatórios financeiros e comandas passadas. Em vez disso, o sistema orienta o lojista a pausar o produto.
4. **Isolamento Multi-tenant Rigoroso:** Todas as ações restritas inferem a loja do usuário através do payload do token JWT decodificado no servidor, impedindo que um lojista acesse ou modifique dados de outro.
5. **Proteção contra Injeção de Dados:** Uso de queries parametrizadas gerenciadas internamente pelo Prisma ORM e pelo driver adapter seguro.
6. **Armazenamento de Credenciais:** As senhas dos usuários nunca são salvas em texto puro, sendo processadas com hash criptográfico `bcrypt` com fator de custo 10.

---

## 🎯 Próximos Passos (Roadmap)

- [ ] **Notificações em Tempo Real:** Substituir o polling periódico de 15 segundos por WebSockets ou Server-Sent Events (SSE).
- [ ] **Automação de Horários (`store_hours`):** Integrar a tabela de horários para abertura e fechamento automático por dia da semana.
- [ ] **Edição e Exclusão de Categorias:** Permitir renomear e excluir categorias pela interface do painel.
- [ ] **Upload Direto de Fotos:** Integração com armazenamento em nuvem (S3/Cloudinary/Uploadthing) em vez de apenas URLs externas de imagem.
- [ ] **Impressão de Comanda Térmica:** Formatação específica para impressão em bobinas térmicas (58mm e 80mm).
- [ ] **Testes Automatizados:** Implementação de testes unitários e de integração com Jest/Vitest e Playwright.

---

Feito com Next.js, React, Tailwind CSS, Prisma ORM e PostgreSQL.
