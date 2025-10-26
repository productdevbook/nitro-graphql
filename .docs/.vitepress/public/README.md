# Public Assets

This directory contains static assets for the Nitro GraphQL documentation.

## Files

### Logos & Images

- **`logo.svg`** - Main Nitro GraphQL logo (120x120)
  - GraphQL diamond shape with integrated Nitro lightning bolt
  - Brand colors: GraphQL Pink (#E10098) + Nitro Green (#00DC82)
  - Used in navbar and documentation headers

- **`og-image.svg`** - Open Graph social media image (1200x630)
  - Used for social media previews (Twitter, Facebook, LinkedIn)
  - Features logo, title, tagline, and key features
  - Dark theme with gradient accents

- **`favicon.ico`** - Favicon placeholder
  - Note: Convert `logo.svg` to proper favicon using:
    - https://realfavicongenerator.net/
    - https://favicon.io/

### Images Directory

- **`images/`** - Additional images and diagrams
  - Add screenshots, diagrams, and other visual assets here

## Design System

### Colors

```css
/* Brand Colors */
--graphql-pink: #E10098
--nitro-green: #00DC82
--purple-accent: #8B5CF6

/* Gradients */
GraphQL Gradient: #E10098 → #C5008A
Nitro Gradient: #00DC82 → #00C174
Purple Gradient: #8B5CF6 → #E10098
```

### Logo Usage

The logo combines:
1. **GraphQL Diamond** - Classic GraphQL logo shape with connection dots
2. **Nitro Lightning** - Nitro's signature lightning bolt
3. **Gradient Colors** - Smooth transition between GraphQL and Nitro brand colors

### File Formats

For best quality across all platforms, consider generating:
- `logo.svg` - Vector (already included)
- `logo-192.png` - For PWA manifest
- `logo-512.png` - For PWA manifest
- `favicon-16x16.png` - Browser favicon
- `favicon-32x32.png` - Browser favicon
- `apple-touch-icon.png` - iOS devices

## Generating Additional Formats

Use these tools to convert the SVG logo:

```bash
# Using ImageMagick (if installed)
convert -background none logo.svg -resize 192x192 logo-192.png
convert -background none logo.svg -resize 512x512 logo-512.png

# Or use online tools:
# - https://realfavicongenerator.net/ (comprehensive favicon generator)
# - https://favicon.io/ (simple favicon converter)
# - https://cloudconvert.com/svg-to-png (SVG to PNG converter)
```

## SEO & Social Media

The `og-image.svg` is configured in `.vitepress/config.mts`:

```typescript
head: [
  ['meta', { property: 'og:image', content: '/og-image.svg' }],
  ['meta', { name: 'twitter:image', content: '/og-image.svg' }],
]
```

## License

These assets are part of the Nitro GraphQL project and follow the same MIT license.
