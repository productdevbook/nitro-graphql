---
title: "Nuxt 5 + Nitro v3 Desteği: nitro-graphql Artık Nuxt 5 ile Çalışıyor!"
description: nitro-graphql v2 beta artık Nuxt 5, Nitro v3 ve Rolldown builder ile tam uyumlu. Yeni örnek projeyi deneyin!
date: 2026-01-10
author: Productdevbook
tags:
  - duyuru
  - nuxt-5
  - nitro-v3
  - rolldown
image: /images/blog/nuxt5.png
---

# Nuxt 5 + Nitro v3 Desteği: nitro-graphql Artık Nuxt 5 ile Çalışıyor!

::callout{type="info"}
Bu örnek, Nuxt 5'in pre-release versiyonunu (`pkg.pr.new`) kullanmaktadır. Production için stabil sürümü bekleyin.
::

Heyecan verici bir duyuru ile karşınızdayız! **nitro-graphql v2 beta** artık **Nuxt 5**, **Nitro v3** ve yeni **Rolldown builder** ile tam uyumlu çalışıyor.

## Teknoloji Stack'i

| Teknoloji | Versiyon |
|-----------|----------|
| Nuxt | 5 (pkg.pr.new) |
| Nitro | v3 |
| Vite | 8.0.0-beta.7 |
| Rolldown | Native builder |
| GraphQL Yoga | 5.18.0 |
| Vue | 3.5.26 |

## Neden Bu Kombinasyon?

### Rolldown Builder ile Yıldırım Hızında Build

Nuxt 5, Nitro v3'ün yeni **Rolldown builder**'ını kullanıyor. Rust tabanlı bu bundler, geleneksel JavaScript bundler'larına göre **~10x daha hızlı** build süreleri sunuyor. Production build'lerde bu fark çok daha belirgin hale geliyor.

### Smart Chunking

GraphQL kodu ayrı chunk'lara bölünür. Rolldown optimizasyonu ile **~%98 boyut küçültme** sağlanır. Bu sayede GraphQL bağımlılıkları ana bundle'ı şişirmiyor.

### Debug Dashboard

Development modunda `/_nitro/graphql/debug` adresinden tüm şemalarınızı, resolver'larınızı ve konfigürasyonunuzu görüntüleyin. Hata ayıklama artık çok daha kolay.

### External Services Desteği

Harici GraphQL API'lerine (GitHub, Shopify, Contentful vb.) bağlanın ve otomatik tip üretimi alın. Birden fazla GraphQL servisi ile çalışmak hiç bu kadar kolay olmamıştı.

### Apollo Federation

Mikroservis mimarisi için Apollo Federation subgraph desteği. Büyük ölçekli uygulamalarda GraphQL'i parçalara ayırın ve bağımsız deploy edin.

### Tam TypeScript Desteği

Tüm tipler otomatik olarak generate ediliyor:

- **Server tipler**: `#graphql/server` - Resolver'larda kullanın
- **Client tipler**: `#graphql/client` - Frontend componentlerde kullanın

## Hızlı Kurulum

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/nuxt my-nuxt-app
cd my-nuxt-app
pnpm install
```

## Diğer Örnekler

Daha fazla örnek için [GitHub Examples](https://github.com/productdevbook/nitro-graphql/tree/main/examples) sayfasını ziyaret edin.

## Sonraki Adımlar

- Nuxt 5 stabil çıktığında tam destek
- Client-side GraphQL hooks desteği
- Daha fazla entegrasyon örneği

Sorularınız için [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues) sayfasını ziyaret edin!
