import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CodePlayground from './components/CodePlayground.vue'
import ComparisonTable from './components/ComparisonTable.vue'
import VideoEmbed from './components/VideoEmbed.vue'
import FeatureGrid from './components/FeatureGrid.vue'
import './styles/vars.css'
import './styles/custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodePlayground', CodePlayground)
    app.component('ComparisonTable', ComparisonTable)
    app.component('VideoEmbed', VideoEmbed)
    app.component('FeatureGrid', FeatureGrid)
  },
} satisfies Theme
