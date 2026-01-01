---
title: Kurulum
description: Nitro GraphQL'i paket yöneticinizle kurun
icon: heroicons:arrow-down-tray
order: 1
tags:
  - baslangic
  - kurulum
---

# Kurulum

## Gereksinimler

- **Node.js** 24+ (veya Bun)
- **pnpm**, **npm**, **yarn** veya **bun**

::callout{type="warning"}
Nitro GraphQL, Nitro v3 ve H3 v2 gerektirmektedir. Bu sürümler Node.js 24+ gerektirir.
::

## Hızlı Başlangıç (Önerilen)

CLI ile hazır template'lerden proje oluşturun:

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm dlx nitro-graphql init my-app -t nitro
  cd my-app
  pnpm install
  pnpm dev
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npx nitro-graphql init my-app -t nitro
  cd my-app
  npm install
  npm run dev
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bunx nitro-graphql init my-app -t nitro
  cd my-app
  bun install
  bun dev
  ```
  ::
::

::callout{type="info"}
Diğer template'ler: `vite`, `vite-react`, `vite-vue`, `drizzle-orm`, `better-auth`

Tüm template'leri görmek için: `npx nitro-graphql init --list`
::

GraphQL Playground: http://localhost:3000/api/graphql

---

## Manuel Kurulum

Mevcut bir projeye eklemek için:

### 1. Paketleri Yükle

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add nitro-graphql graphql graphql-yoga rolldown
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install nitro-graphql graphql graphql-yoga rolldown
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn add nitro-graphql graphql graphql-yoga rolldown
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add nitro-graphql graphql graphql-yoga rolldown
  ```
  ::
::

### 2. Yapılandırma

#### Nitro

`nitro.config.ts` dosyasına ekleyin:

```typescript
import { defineConfig } from 'nitro'
import graphql from 'nitro-graphql'

export default defineConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
    })
  ]
})
```

#### Vite + Nitro

`vite.config.ts` dosyasına ekleyin:

```typescript
import graphql from 'nitro-graphql'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    graphql({
      framework: 'graphql-yoga',
    }),
    nitro(),
  ],
})
```

#### Nuxt

::feature{status="coming-soon" title="Nuxt Desteği"}
Nuxt şu anda desteklenmemektedir. Nuxt 5 ile birlikte destek eklenecektir.
::

### 3. GraphQL Dosyalarını Oluştur

```
my-project/
├── server/
│   └── graphql/
│       ├── config.ts         # GraphQL yapılandırması
│       ├── schema.graphql    # Schema tanımları
│       └── hello.resolver.ts # Resolver'lar
├── nitro.config.ts
└── package.json
```

**server/graphql/config.ts:**
```typescript
import { defineGraphQLConfig } from 'nitro-graphql/define'

export default defineGraphQLConfig({})
```

**server/graphql/schema.graphql:**
```graphql
type Query {
  hello: String!
}
```

**server/graphql/hello.resolver.ts:**
```typescript
import { defineQuery } from 'nitro-graphql/define'

export const helloQueries = defineQuery({
  hello: () => 'Hello from Nitro GraphQL!',
})
```

### 4. Dev Sunucusunu Başlat

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm dev
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm run dev
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn dev
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun dev
  ```
  ::
::

GraphQL Playground: http://localhost:3000/api/graphql

::callout{type="success"}
GraphiQL arayüzünü görüyorsanız kurulum tamamdır!
::

