---
title: CLI Kullanımı
description: Nitro GraphQL CLI ile proje oluşturma ve tip üretimi
icon: heroicons:command-line
order: 2
tags:
  - cli
  - tools
---

# Nitro GraphQL CLI

Nitro GraphQL, standalone bir CLI aracı ile birlikte gelir. Bu araç ile:

- Hazır template'lerden yeni projeler oluşturabilir
- GraphQL tiplerini generate edebilir
- Schema'larınızı validate edebilir
- Shell tab completion kullanabilirsiniz

## Kurulum

### Proje İçi Kurulum

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -D nitro-graphql
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -D nitro-graphql
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn add -D nitro-graphql
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -D nitro-graphql
  ```
  ::
::

### Global Kurulum

Shell completion özelliğini her yerde kullanmak için global kurulum önerilir:

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -g nitro-graphql
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -g nitro-graphql
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn global add nitro-graphql
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -g nitro-graphql
  ```
  ::
::

## Komutlar

### `init` - Proje Oluşturma

Yeni bir Nitro GraphQL projesi oluşturur.

#### Temel Kullanım (Boş Proje)

```bash
nitro-graphql init
```

Bu komut mevcut dizinde temel dosyaları oluşturur:
- `nitro-graphql.config.ts` - Konfigürasyon dosyası
- `tsconfig.json` - TypeScript ayarları
- `server/graphql/schema.graphql` - Örnek schema
- `server/graphql/hello.resolver.ts` - Örnek resolver
- `graphql/hello.graphql` - Örnek client query

#### Template ile Proje Oluşturma

Hazır template'lerden proje oluşturmak için:

```bash
# Template listesini göster
nitro-graphql init --list
nitro-graphql init -l

# Template ile yeni proje oluştur
nitro-graphql init my-app --template drizzle-orm
nitro-graphql init my-app -t vite-react
```

#### Mevcut Template'ler

| Template | Açıklama |
|----------|----------|
| `drizzle-orm` | Nitro + GraphQL + Drizzle ORM (PostgreSQL) |
| `vite` | Vite + Nitro GraphQL entegrasyonu |
| `vite-react` | Vite + React + Nitro GraphQL |
| `vite-vue` | Vite + Vue + Nitro GraphQL |
| `better-auth` | Nitro + GraphQL + Better Auth entegrasyonu |

#### Custom Template Kullanımı

GitHub, GitLab veya başka kaynaklardan template indirebilirsiniz:

```bash
# GitHub shorthand
nitro-graphql init my-app -t gh:user/repo

# GitHub tam yol
nitro-graphql init my-app -t github:user/repo/subdirectory

# GitLab
nitro-graphql init my-app -t gitlab:user/repo
```

#### Seçenekler

| Seçenek | Kısa | Açıklama |
|---------|------|----------|
| `--template` | `-t` | Kullanılacak template |
| `--list` | `-l` | Mevcut template'leri listele |
| `--force` | `-f` | Mevcut dosyaların üzerine yaz |
| `--cwd` | | Çalışma dizinini belirle |

### `generate` - Tip Üretimi

GraphQL schema'larından TypeScript tiplerini üretir.

```bash
# Tüm tipleri üret (server + client)
nitro-graphql generate
nitro-graphql gen
nitro-graphql g

# Sadece server tiplerini üret
nitro-graphql generate:server
nitro-graphql gen:server

# Sadece client tiplerini üret
nitro-graphql generate:client
nitro-graphql gen:client

# Watch modunda çalıştır
nitro-graphql generate --watch
nitro-graphql g -w
```

#### Seçenekler

| Seçenek | Kısa | Açıklama |
|---------|------|----------|
| `--watch` | `-w` | Dosya değişikliklerini izle |
| `--silent` | `-s` | Çıktıyı bastır |
| `--runtime` | `-r` | Runtime dosyalarını da üret |
| `--cwd` | | Çalışma dizinini belirle |

### `validate` - Schema Doğrulama

GraphQL schema'larınızı doğrular ve hataları raporlar.

```bash
nitro-graphql validate
nitro-graphql v
```

## Shell Tab Completion

CLI, shell tab completion desteği sunar. Bu özellik ile komutları ve seçenekleri TAB tuşu ile tamamlayabilirsiniz.

### Desteklenen Shell'ler

- **zsh** (macOS varsayılan)
- **bash**
- **fish**
- **PowerShell**

### Kurulum

::tabs
  ::tab{label="zsh"}
  ```bash
  # 1. Completion script'ini dosyaya kaydet
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh

  # 2. ~/.zshrc dosyasına ekle
  echo 'source ~/.nitro-graphql-completion.zsh' >> ~/.zshrc

  # 3. Shell'i yeniden yükle
  source ~/.zshrc
  ```
  ::

  ::tab{label="bash"}
  ```bash
  # 1. Completion script'ini dosyaya kaydet
  nitro-graphql complete bash > ~/.nitro-graphql-completion.bash

  # 2. ~/.bashrc dosyasına ekle
  echo 'source ~/.nitro-graphql-completion.bash' >> ~/.bashrc

  # 3. Shell'i yeniden yükle
  source ~/.bashrc
  ```
  ::

  ::tab{label="fish"}
  ```bash
  # Completions klasörüne kaydet
  nitro-graphql complete fish > ~/.config/fish/completions/nitro-graphql.fish
  ```
  ::

  ::tab{label="PowerShell"}
  ```powershell
  # Profile'a ekle
  nitro-graphql complete powershell >> $PROFILE
  ```
  ::
::

### Geçici Kullanım

Completion'ı kalıcı kurmadan test etmek için:

::tabs
  ::tab{label="zsh"}
  ```bash
  source <(nitro-graphql complete zsh)
  ```
  ::

  ::tab{label="bash"}
  ```bash
  source <(nitro-graphql complete bash)
  ```
  ::
::

### Kullanım Örnekleri

Kurulumdan sonra TAB tuşu ile tamamlama yapabilirsiniz:

```bash
# Komut tamamlama
nitro-graphql <TAB>
# → generate, gen, g, init, validate, v, complete

# Alt komut tamamlama
nitro-graphql gen<TAB>
# → generate, generate:server, generate:client

# Template tamamlama
nitro-graphql init -t <TAB>
# → drizzle-orm, vite, vite-react, vite-vue, better-auth, gh:, github:, gitlab:

# Seçenek tamamlama
nitro-graphql init -<TAB>
# → -t, -l, -f, --template, --list, --force, --cwd
```

## Konfigürasyon Dosyası

CLI, `nitro-graphql.config.ts` dosyasından ayarları okur:

```typescript
import { defineConfig } from 'nitro-graphql/cli'

export default defineConfig({
  // GraphQL framework: 'graphql-yoga' | 'apollo-server'
  framework: 'graphql-yoga',

  // Server tarafı GraphQL dosyaları
  serverDir: './server/graphql',

  // Client tarafı GraphQL dosyaları
  clientDir: './graphql',

  // Build çıktı dizini
  buildDir: './.nitro-graphql',

  // Tip dosyaları dizini
  typesDir: './.nitro-graphql/types',

  // Yoksayılacak dosya desenleri
  ignore: ['**/node_modules/**', '**/dist/**'],
})
```

## Sık Sorulan Sorular

### Global kurulum şart mı?

Hayır, proje içi kurulum yeterlidir. Ancak shell completion özelliğini her yerde kullanmak istiyorsanız global kurulum önerilir.

### Template'ler nereden indiriliyor?

Template'ler GitHub'daki `productdevbook/nitro-graphql` reposunun `examples/` klasöründen indirilir.

### Custom template nasıl oluştururum?

Herhangi bir GitHub reposunu template olarak kullanabilirsiniz:

```bash
nitro-graphql init my-app -t github:username/my-template
```

Template'inizde en azından şu dosyalar olmalı:
- `package.json`
- GraphQL schema dosyaları
- Resolver dosyaları

### Completion çalışmıyor, ne yapmalıyım?

1. CLI'ın global kurulu olduğundan emin olun
2. Completion script'ini yeniden oluşturun
3. Shell'i yeniden başlatın

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::
::
