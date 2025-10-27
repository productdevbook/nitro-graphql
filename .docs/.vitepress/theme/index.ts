import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CodePlayground from './components/CodePlayground.vue'
import ComparisonTable from './components/ComparisonTable.vue'
import FeatureGrid from './components/FeatureGrid.vue'
import VideoEmbed from './components/VideoEmbed.vue'
import './styles/vars.css'
import './styles/custom.css'
import './styles/landing.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodePlayground', CodePlayground)
    app.component('ComparisonTable', ComparisonTable)
    app.component('VideoEmbed', VideoEmbed)
    app.component('FeatureGrid', FeatureGrid)
  },
} satisfies Theme
