---
title: Nitro GraphQL
titleTemplate: GraphQL Integration for Nitro
# add `dark` here to apply dark mode on initial load,
# since `onMounted` doesn't run during SSR
pageClass: landing dark

layout: home
aside: false
editLink: false
markdownStyles: false
---

<script setup>
import { useData } from 'vitepress'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Hero from './.vitepress/theme/components/landing/1. hero-section/HeroSection.vue'
import FeatureSection from './.vitepress/theme/components/landing/2. feature-section/FeatureSection.vue'
import CodeExamplesSection from './.vitepress/theme/components/landing/3. code-examples/CodeExamplesSection.vue'
import ComparisonSection from './.vitepress/theme/components/landing/4. comparison/ComparisonSection.vue'
import CommunitySection from './.vitepress/theme/components/landing/4. community-section/CommunitySection.vue'
import EcosystemSection from './.vitepress/theme/components/landing/6. ecosystem/EcosystemSection.vue'
import GetStartedSection from './.vitepress/theme/components/landing/6. get-started-section/GetStartedSection.vue'
import FeatureInstantServerStart from './.vitepress/theme/components/landing/2. feature-section/FeatureInstantServerStart.vue'
import FeatureHMR from './.vitepress/theme/components/landing/2. feature-section/FeatureHMR.vue'
import FeatureRichFeatures from './.vitepress/theme/components/landing/2. feature-section/FeatureRichFeatures.vue'
import FeatureOptimizedBuild from './.vitepress/theme/components/landing/2. feature-section/FeatureOptimizedBuild.vue'
import FeatureFlexiblePlugins from './.vitepress/theme/components/landing/2. feature-section/FeatureFlexiblePlugins.vue'
import FeatureTypedAPI from './.vitepress/theme/components/landing/2. feature-section/FeatureTypedAPI.vue'
import FeatureSSRSupport from './.vitepress/theme/components/landing/2. feature-section/FeatureSSRSupport.vue'
import FeatureCI from './.vitepress/theme/components/landing/2. feature-section/FeatureCI.vue'

const { isDark } = useData()

onMounted(() => {
  document.documentElement.classList.add('dark')
})

onBeforeUnmount(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
})
</script>

<div class="VPHome">
  <Hero/>
  <CodeExamplesSection />
  <FeatureSection title="Powerful features out of the box" description="Everything you need for modern GraphQL development" type="pink">
    <FeatureInstantServerStart />
    <FeatureHMR />
    <FeatureRichFeatures />
    <FeatureOptimizedBuild />
  </FeatureSection>
  <ComparisonSection />
  <FeatureSection title="Built for the real world" type="blue" class="feature-section--flip">
    <FeatureFlexiblePlugins />
    <FeatureTypedAPI />
    <FeatureSSRSupport />
    <FeatureCI />
  </FeatureSection>
  <EcosystemSection />
  <CommunitySection />
  <GetStartedSection />
</div>
