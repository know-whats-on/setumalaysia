import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const indexMetadata = {
  ghar: {
    title: 'SETU India AU — Student Housing Safety',
    description:
      'Student housing safety tools for Australia, including rental evidence support, community property reviews, and India-to-Australia tenancy guidance.',
    ogTitle: 'SETU India AU: Student Housing Safety',
    image: '/assets/9e9d6085e4d71aa54795c18535d811752c34df5a.png',
    url: 'https://ghar.knowwhatson.com',
  },
  burb_mate: {
    title: 'Hoodie - Your Australia Suburb Mate',
    description:
      'Hoodie helps you explore suburbs, keep up with local updates, plan with friends, understand housing context, and settle into Australia with more confidence.',
    ogTitle: 'Hoodie: Your Australia Suburb Mate',
    image: 'https://suburb.knowwhatson.com/social/hoodie-share-banner.png',
    url: 'https://suburb.knowwhatson.com',
  },
  setu_china: {
    title: '留澳助手 AU — Chinese Student Life in Australia',
    description:
      'Chinese-first student arrival, events, housing safety, suburb guidance, and practical Australia support for Chinese international students.',
    ogTitle: '留澳助手 AU: Chinese Student Life in Australia',
    image: '/assets/setu-china-app-icon.png',
    url: 'https://china.knowwhatson.com',
  },
  jom_settle: {
    title: 'Senang AU — Kehidupan Pelajar Malaysia di Australia',
    description:
      'Senang AU helps Malaysian students in Australia sort arrival tasks, TFN, OSHC, makan plans, housing safety, suburb guidance, and student life support.',
    ogTitle: 'Senang AU: Malaysian Student Life in Australia',
    image: '/assets/setu-malaysia-social.png',
    url: 'https://malaysia.knowwhatson.com',
  },
  wheres_wolli: {
    title: "Where's Wolli - Bayside Council Local Guide",
    description:
      "Where's Wolli helps Bayside Council locals, newcomers, and residents find council news, events, services, and official local links.",
    ogTitle: "Where's Wolli: Bayside Council Local Guide",
    image: '/assets/wolli/wolli-app-icon.png',
    url: 'https://wolli.knowwhatson.com',
  },
}

function resolveIndexVariant() {
  const normalized = String(process.env.VITE_APP_VARIANT || '').trim().toLowerCase()
  if (normalized === 'burb_mate' || normalized === 'burb-mate' || normalized === 'burbmate') return 'burb_mate'
  if (normalized === 'setu_china' || normalized === 'setu-china' || normalized === 'setuchina' || normalized === 'china') return 'setu_china'
  if (normalized === 'jom_settle' || normalized === 'jom-settle' || normalized === 'jomsettle' || normalized === 'malaysia') return 'jom_settle'
  if (
    normalized === 'wheres_wolli'
    || normalized === 'wheres-wolli'
    || normalized === 'where-s-wolli'
    || normalized === 'where_wolli'
    || normalized === 'whereswolli'
    || normalized === 'wolli'
  ) return 'wheres_wolli'
  return 'ghar'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function replaceMetaContent(html: string, key: 'name' | 'property', id: string, content: string) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `(<meta\\s+${key}="${escapedId}"\\s+content=")[^"]*(")`,
    's',
  )
  return html.replace(pattern, `$1${escapeAttr(content)}$2`)
}

function appIndexMetadataPlugin() {
  return {
    name: 'app-index-metadata',
    transformIndexHtml(html: string) {
      const metadata = indexMetadata[resolveIndexVariant()]
      let next = html.replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${escapeHtml(metadata.title)}</title>`,
      )
      next = replaceMetaContent(next, 'name', 'description', metadata.description)
      next = replaceMetaContent(next, 'property', 'og:title', metadata.ogTitle)
      next = replaceMetaContent(next, 'property', 'og:description', metadata.description)
      next = replaceMetaContent(next, 'property', 'og:image', metadata.image)
      next = replaceMetaContent(next, 'property', 'og:url', metadata.url)
      next = replaceMetaContent(next, 'name', 'twitter:title', metadata.ogTitle)
      next = replaceMetaContent(next, 'name', 'twitter:description', metadata.description)
      next = replaceMetaContent(next, 'name', 'twitter:image', metadata.image)
      return next
    },
  }
}

export default defineConfig({
  plugins: [
    appIndexMetadataPlugin(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  esbuild: {
    target: 'esnext',
  },
  build: {
    target: 'esnext',
  },
  test: {
    include: ['src/app/**/*.test.ts', 'src/app/**/*.test.tsx'],
  },
  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
