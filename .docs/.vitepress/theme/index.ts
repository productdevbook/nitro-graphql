import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CodePlayground from './components/CodePlayground.vue'
import ComparisonTable from './components/ComparisonTable.vue'
import FeatureGrid from './components/FeatureGrid.vue'
import VideoEmbed from './components/VideoEmbed.vue'
import FunctionInfo from './components/FunctionInfo.vue'
import Contributors from './components/Contributors.vue'
import Changelog from './components/Changelog.vue'
import SourceLinks from './components/SourceLinks.vue'
import './styles/vars.css'
import './styles/custom.css'
import './styles/landing.css'
import './styles/metadata.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodePlayground', CodePlayground)
    app.component('ComparisonTable', ComparisonTable)
    app.component('VideoEmbed', VideoEmbed)
    app.component('FeatureGrid', FeatureGrid)
    app.component('FunctionInfo', FunctionInfo)
    app.component('Contributors', Contributors)
    app.component('Changelog', Changelog)
    app.component('SourceLinks', SourceLinks)
  },
} satisfies Theme
