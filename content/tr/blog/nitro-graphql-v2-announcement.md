---
title: Nitro GraphQL v2 Bloguna Hoş Geldiniz
description: Bu blogda Nitro GraphQL v2 hakkında haberler, güncellemeler ve teknik makaleler paylaşacağız.
date: 2026-01-01
author: Productdevbook
tags:
  - duyuru
  - nitro-graphql
image: /images/blog/welcome.png
---

# Nitro GraphQL v2 Bloguna Hoş Geldiniz

::callout{type="warning"}
Bu dokümantasyon şu anda **beta** aşamasındadır. Haftalık olarak içerikleri güncelleyip iyileştireceğiz.
::

Merhaba! Resmi Nitro GraphQL v2 bloguna hoş geldiniz. Projemizle ilgili tüm haberleri, güncellemeleri ve teknik makaleleri burada paylaşacağız.

![Nitro GraphQL Banner](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop)

## Nitro GraphQL Nedir?

Nitro GraphQL, tüm JavaScript/TypeScript ekosistemi için geliştirilmiş bir GraphQL entegrasyon modülüdür. **Nitro**, **Vite** ve diğer modern araçlarla çalışır. Otomatik olarak:

- GraphQL şemalarını ve resolver'ları keşfeder
- TypeScript tip dosyalarını üretir
- Hem GraphQL Yoga hem de Apollo Server'ı destekler
- Apollo Federation ile çalışır
- Standalone CLI ile bağımsız kullanım

## v2'deki Yenilikler

### Standalone CLI

Artık Nitro veya Vite entegrasyonu olmadan da kullanabilirsiniz:

```bash
# Template ile proje oluştur
nitro-graphql init my-app -t nitro

# Tip üretimi
nitro-graphql generate --watch

# Schema doğrulama
nitro-graphql validate
```

### Template Sistemi

Hazır template'lerden hızlıca proje oluşturun:
- `nitro` - Minimal başlangıç
- `vite`, `vite-react`, `vite-vue` - Frontend entegrasyonları
- `drizzle-orm` - Veritabanı entegrasyonu
- `better-auth` - Kimlik doğrulama

**Takımlar için:** Kendi template'inizi oluşturup GitHub'da paylaşın:
```bash
nitro-graphql init my-app -t gh:sirketiniz/graphql-template
```

### Shell Tab Completion

Komutları TAB ile tamamlayın:
```bash
nitro-graphql complete zsh >> ~/.zshrc
```

### Vite Entegrasyonu

Vite ile doğrudan entegrasyon. Rolldown optimizasyonu sayesinde **%98'e varan boyut küçültme**.

### Runtime Dosya Üretimi

Standalone sunucu kullanımı için:
```bash
nitro-graphql generate --runtime
```
Bu komut `resolvers.ts`, `schema.ts` ve `index.ts` dosyalarını üretir.

## Pixel Content ile Oluşturuldu

Bu dokümantasyon sitesi [Pixel Content](https://pixelcontent.dev) kullanılarak oluşturuldu. Pixel Content, Nuxt tabanlı modern bir dokümantasyon ve blog platformudur.

**Pixel Content özellikleri:**
- Çoklu dil desteği (i18n)
- Blog ve dokümantasyon
- SEO optimizasyonu
- Koyu/Açık tema
- MDC (Markdown Components) desteği

Kendi dokümantasyon sitenizi oluşturmak için [Pixel Content'i satın alın](https://polar.sh/checkout/polar_c_20v9TTkTTf0DOATqr0PG1NJlVVgXilxecDPrL0y6NQg).

## Yaklaşan Yazılar

Önümüzdeki haftalarda aşağıdaki konularda makaleler yayınlayacağız:

1. **Başlangıç Rehberi** - Nitro GraphQL nasıl kurulur
2. **Resolver Yazımı** - TypeScript ile tip güvenli resolver'lar
3. **Federation** - Mikroservis mimarisiyle GraphQL
4. **Performans İpuçları** - Prodüksiyonda optimizasyon

Takipte kalın!
