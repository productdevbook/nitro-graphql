<script setup lang="ts">
import { gsap } from 'gsap'
import { onMounted, onUnmounted, ref } from 'vue'

const schemas = ref<string[]>([])
const resolvers = ref<string[]>([])
const types = ref<string[]>([])

const schemaFiles = ['user.graphql', 'post.graphql', 'comment.graphql', 'schema.graphql']
const resolverFiles = ['user.resolver.ts', 'post.resolver.ts', 'comment.resolver.ts']
const typeFiles = ['#graphql/server', '#graphql/client', 'sdk.ts', 'ofetch.ts']

let mainTimeline: gsap.core.Timeline | null = null

function getParticleStyle(index: number) {
  const size = Math.random() * 3 + 1
  const duration = Math.random() * 20 + 15
  const delay = Math.random() * 5
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  }
}

onMounted(() => {
  startAnimation()
})

onUnmounted(() => {
  mainTimeline?.kill()
})

function startAnimation() {
  mainTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2 })

  // Reset all arrays
  mainTimeline.call(() => {
    schemas.value = []
    resolvers.value = []
    types.value = []
  })

  // Phase 1: Schema files appear one by one
  schemaFiles.forEach((file, index) => {
    mainTimeline.call(
      () => {
        schemas.value = [...schemas.value, file]
      },
      undefined,
      `+=${index === 0 ? 0.3 : 0.15}`
    )
  })

  // Phase 2: Resolvers appear
  resolverFiles.forEach((file, index) => {
    mainTimeline.call(
      () => {
        resolvers.value = [...resolvers.value, file]
      },
      undefined,
      `+=${index === 0 ? 0.4 : 0.15}`
    )
  })

  // Phase 3: Types appear
  typeFiles.forEach((file, index) => {
    mainTimeline.call(
      () => {
        types.value = [...types.value, file]
      },
      undefined,
      `+=${index === 0 ? 0.5 : 0.2}`
    )
  })

  // Hold at the end before restart
  mainTimeline.to({}, { duration: 2 })
}
</script>

<template>
  <div id="graphql-flow-diagram" class="hero-diagram">
    <div class="diagram-container">
      <!-- Input Side -->
      <div class="diagram-side input-side">
        <div class="side-label">Input</div>
        <div class="file-group">
          <div class="file-group-label">Schemas</div>
          <div class="file-list">
            <transition-group name="file">
              <div
                v-for="file in schemas"
                :key="file"
                class="file-item schema-file"
              >
                <span class="file-icon">📄</span>
                <span class="file-name">{{ file }}</span>
              </div>
            </transition-group>
          </div>
        </div>

        <div class="file-group">
          <div class="file-group-label">Resolvers</div>
          <div class="file-list">
            <transition-group name="file">
              <div
                v-for="file in resolvers"
                :key="file"
                class="file-item resolver-file"
              >
                <span class="file-icon">⚡</span>
                <span class="file-name">{{ file }}</span>
              </div>
            </transition-group>
          </div>
        </div>
      </div>

      <!-- Center Processing -->
      <div class="diagram-center">
        <div class="process-box">
          <div class="process-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#E10098" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="process-label">Nitro GraphQL</div>
          <div class="process-tags">
            <span class="process-tag">Auto-Discovery</span>
            <span class="process-tag">Type Generation</span>
            <span class="process-tag">Zero Config</span>
          </div>
        </div>

        <!-- Flow Lines -->
        <svg class="flow-lines" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#E10098" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#FF4DB8" stop-opacity="0.8"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <!-- Output Side -->
      <div class="diagram-side output-side">
        <div class="side-label">Output</div>
        <div class="file-group">
          <div class="file-group-label">Generated</div>
          <div class="file-list">
            <transition-group name="file">
              <div
                v-for="file in types"
                :key="file"
                class="file-item type-file"
              >
                <span class="file-icon">✨</span>
                <span class="file-name">{{ file }}</span>
              </div>
            </transition-group>
          </div>
        </div>

        <div class="ready-indicator" :class="{ active: types.length > 0 }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="#13b351" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>GraphQL Ready</span>
        </div>
      </div>
    </div>

    <!-- Background Effects -->
    <div class="hero-glow"></div>
    <div class="animated-grid">
      <div class="grid-line grid-line-v" v-for="i in 12" :key="`v-${i}`" :style="{ left: `${i * 8.33}%` }"></div>
      <div class="grid-line grid-line-h" v-for="i in 6" :key="`h-${i}`" :style="{ top: `${i * 16.66}%` }"></div>
    </div>
    <div class="floating-particles">
      <div class="particle" v-for="i in 20" :key="`p-${i}`" :style="getParticleStyle(i)"></div>
    </div>
  </div>
</template>

<style scoped>
.hero-diagram {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 80px auto 0;
  padding: 0 24px;
  height: 450px;

  @media (max-width: 768px) {
    display: none;
  }

  @media (min-width: 1024px) {
    height: 400px;
  }
}

.diagram-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 40px;
  align-items: center;
  position: relative;
  z-index: 2;
  height: 100%;

  @media (min-width: 1024px) {
    gap: 60px;
  }
}

.diagram-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  justify-content: center;
}

.side-label {
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
}

.file-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 auto;
}

.file-group-label {
  font-size: 13px;
  font-weight: 500;
  color: #a9a9a9;
  padding-left: 12px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 180px;
  position: relative;

  @media (min-width: 1024px) {
    height: 200px;
  }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(23, 23, 23, 0.6);
  border: 1px solid #2b2b2b;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #e4e4e7;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  @media (min-width: 1024px) {
    gap: 10px;
    padding: 8px 12px;
    font-size: 12px;
  }

  &:hover {
    border-color: #404040;
    background: rgba(23, 23, 23, 0.8);
  }

  .input-side & {
    &:hover {
      transform: translateX(4px);
    }
  }

  .output-side & {
    &:hover {
      transform: translateX(-4px);
    }
  }
}

.schema-file {
  border-left: 2px solid #E10098;
}

.resolver-file {
  border-left: 2px solid #FF4DB8;
}

.type-file {
  border-left: 2px solid #13b351;
  background: rgba(19, 179, 81, 0.05);
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* File transitions */
.file-enter-active {
  transition: all 0.4s ease;
}

.file-leave-active {
  transition: all 0.4s ease;
  position: absolute;
}

.file-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.file-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.file-move {
  transition: none;
}

/* Center Process Box */
.diagram-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.process-box {
  background: rgba(23, 23, 23, 0.8);
  border: 2px solid #E10098;
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 40px rgba(225, 0, 152, 0.3);
  position: relative;
  z-index: 3;

  @media (min-width: 1024px) {
    border-radius: 20px;
    padding: 32px 28px;
  }
}

.process-icon {
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(225, 0, 152, 0.1);
  border-radius: 12px;

  @media (min-width: 1024px) {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    margin-bottom: 16px;
  }

  svg {
    width: 40px;
    height: 40px;

    @media (min-width: 1024px) {
      width: 60px;
      height: 60px;
    }
  }
}

.process-label {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;

  @media (min-width: 1024px) {
    font-size: 20px;
    margin-bottom: 16px;
  }
}

.process-tags {
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (min-width: 1024px) {
    gap: 6px;
  }
}

.process-tag {
  font-size: 10px;
  color: #FF4DB8;
  padding: 4px 10px;
  background: rgba(225, 0, 152, 0.15);
  border-radius: 4px;
  border: 1px solid rgba(225, 0, 152, 0.3);

  @media (min-width: 1024px) {
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 6px;
  }
}

/* Ready Indicator */
.ready-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(19, 179, 81, 0.1);
  border: 1px solid rgba(19, 179, 81, 0.3);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #13b351;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.4s ease;

  &.active {
    opacity: 1;
    transform: scale(1);
  }

  svg {
    flex-shrink: 0;
  }
}

/* Background Glow */
.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(225, 0, 152, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

/* Animated Grid */
.animated-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  opacity: 0.15;
}

.grid-line {
  position: absolute;
  background: linear-gradient(to bottom, transparent, rgba(225, 0, 152, 0.3), transparent);
}

.grid-line-v {
  width: 1px;
  height: 100%;
  animation: gridPulseV 3s ease-in-out infinite;
}

.grid-line-h {
  height: 1px;
  width: 100%;
  background: linear-gradient(to right, transparent, rgba(225, 0, 152, 0.3), transparent);
  animation: gridPulseH 3s ease-in-out infinite;
}

.grid-line:nth-child(2n) {
  animation-delay: 0.5s;
}

.grid-line:nth-child(3n) {
  animation-delay: 1s;
}

@keyframes gridPulseV {
  0%, 100% {
    opacity: 0.3;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.6;
    transform: scaleY(1.05);
  }
}

@keyframes gridPulseH {
  0%, 100% {
    opacity: 0.3;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.6;
    transform: scaleX(1.05);
  }
}

/* Floating Particles */
.floating-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  background: radial-gradient(circle, rgba(225, 0, 152, 0.8) 0%, rgba(255, 77, 184, 0.4) 50%, transparent 100%);
  border-radius: 50%;
  animation: float linear infinite;
  opacity: 0;
}

@keyframes float {
  0% {
    opacity: 0;
    transform: translateY(0) translateX(0) scale(0);
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-100vh) translateX(20px) scale(1.5);
  }
}

/* Data flow lines animation */
.diagram-container::before,
.diagram-container::after {
  content: '';
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(225, 0, 152, 0.5), transparent);
  opacity: 0;
  animation: dataFlow 3s ease-in-out infinite;
  z-index: 1;
}

.diagram-container::before {
  top: 50%;
  left: 0;
  width: 40%;
  animation-delay: 0.5s;
}

.diagram-container::after {
  top: 50%;
  right: 0;
  width: 40%;
  animation-delay: 1.5s;
}

@keyframes dataFlow {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  50% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(20px);
  }
}
</style>
