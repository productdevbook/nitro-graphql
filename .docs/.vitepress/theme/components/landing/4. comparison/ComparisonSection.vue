<script setup lang="ts">
import { ref } from 'vue'
import { useSlideIn } from '../../../composables/useSlideIn'

useSlideIn('#comparison')

type View = 'before' | 'after'

const activeView = ref<View>('before')

const beforeSteps = [
  { icon: '📝', title: 'Install dependencies', description: 'graphql, @graphql-tools/schema, @graphql-tools/load-files...' },
  { icon: '⚙️', title: 'Configure server', description: 'Set up GraphQL server, context, error handling' },
  { icon: '📦', title: 'Build schema', description: 'Manually combine type definitions and resolvers' },
  { icon: '🔧', title: 'Setup type generation', description: 'Configure GraphQL Codegen with multiple plugins' },
  { icon: '🔄', title: 'Watch for changes', description: 'Set up file watchers for schema regeneration' },
  { icon: '📱', title: 'Configure client', description: 'Set up GraphQL client with typed operations' },
]

const afterSteps = [
  { icon: '⚡', title: 'Install Nitro GraphQL', description: 'pnpm add nitro-graphql', highlight: true },
  { icon: '✨', title: 'Drop your .graphql files', description: 'Auto-discovery handles the rest', highlight: true },
  { icon: '🎉', title: 'Start coding', description: 'Fully typed GraphQL API ready to use!', highlight: true },
]
</script>

<template>
  <section id="comparison" class="comparison">
    <div class="comparison__container">
      <div class="comparison__header">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="70"
          height="61"
          viewBox="0 0 70 61"
          fill="none"
          style="overflow: visible"
        >
          <path
            d="M38.5 0.772461V60.5215M22.6301 60.7725V38.7905C22.6301 25.3784 17.3675 12.5156 8 3.03184M54.3699 60.7725V38.7905C54.3699 25.3784 59.6325 12.5156 69 3.03184"
            stroke="url(#linear-gradient-comparison)"
            stroke-width="2"
          />
          <defs>
            <linearGradient
              id="linear-gradient-comparison"
              x1="38.5"
              y1="0.772461"
              x2="38.5"
              y2="60.7725"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stop-color="#404040" stop-opacity="0" />
              <stop offset="0.5" stop-color="#737373" />
              <stop offset="1" stop-color="#404040" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <h2>Before vs After</h2>
        <p>See how Nitro GraphQL simplifies your workflow</p>
      </div>

      <div class="comparison__toggle">
        <button
          :class="['toggle-btn', { active: activeView === 'before' }]"
          @click="activeView = 'before'"
        >
          <span class="toggle-icon">😓</span>
          <span>Manual Setup</span>
        </button>
        <button
          :class="['toggle-btn', { active: activeView === 'after' }]"
          @click="activeView = 'after'"
        >
          <span class="toggle-icon">🚀</span>
          <span>With Nitro GraphQL</span>
        </button>
      </div>

      <div class="comparison__content">
        <transition name="fade" mode="out-in">
          <div v-if="activeView === 'before'" key="before" class="comparison__view">
            <div class="steps-grid">
              <div
                v-for="(step, index) in beforeSteps"
                :key="index"
                class="step-card"
                :style="{ animationDelay: `${index * 0.1}s` }"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-icon">{{ step.icon }}</div>
                <div class="step-content">
                  <h4>{{ step.title }}</h4>
                  <p>{{ step.description }}</p>
                </div>
              </div>
            </div>
            <div class="view-footer">
              <span class="footer-text">Hours of configuration and setup 😫</span>
            </div>
          </div>

          <div v-else key="after" class="comparison__view">
            <div class="steps-grid steps-grid--simple">
              <div
                v-for="(step, index) in afterSteps"
                :key="index"
                :class="['step-card', 'step-card--highlight', { 'step-card--glow': step.highlight }]"
                :style="{ animationDelay: `${index * 0.15}s` }"
              >
                <div class="step-number step-number--highlight">{{ index + 1 }}</div>
                <div class="step-icon">{{ step.icon }}</div>
                <div class="step-content">
                  <h4>{{ step.title }}</h4>
                  <p>{{ step.description }}</p>
                </div>
              </div>
            </div>
            <div class="view-footer view-footer--success">
              <span class="footer-text">Minutes to production-ready GraphQL 🎉</span>
            </div>
          </div>
        </transition>
      </div>

      <div class="comparison__glow"></div>
    </div>
  </section>
</template>

<style scoped>
.comparison {
  width: 100%;
  padding: 120px 24px;
  position: relative;
  background: linear-gradient(180deg, transparent 0%, rgba(139, 92, 246, 0.03) 50%, transparent 100%);
}

.comparison__container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.comparison__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 60px;
  gap: 15px;

  svg {
    position: relative;
    margin-bottom: 0;
    z-index: 2;
  }

  h2 {
    font-size: 48px;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 16px;
    background: radial-gradient(
      circle 300px at 30% -180%,
      #8B5CF6 0%,
      #ffffff 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow:
      0 0 4px rgba(255, 255, 255, 0.1),
      0 0 14px rgba(139, 92, 246, 0.2);

    @media (max-width: 768px) {
      font-size: 36px;
    }
  }

  p {
    font-size: 20px;
    color: #a9a9a9;

    @media (max-width: 768px) {
      font-size: 16px;
    }
  }
}

.comparison__toggle {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 48px;

  @media (max-width: 640px) {
    flex-direction: column;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(23, 23, 23, 0.6);
  border: 1px solid #2b2b2b;
  border-radius: 12px;
  color: #a9a9a9;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  .toggle-icon {
    font-size: 20px;
  }

  &:hover {
    border-color: #404040;
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  &.active {
    border-color: #E10098;
    background: rgba(225, 0, 152, 0.1);
    color: #FF4DB8;
    box-shadow: 0 0 20px rgba(225, 0, 152, 0.3);
  }

  @media (max-width: 640px) {
    justify-content: center;
  }
}

.comparison__content {
  min-height: 600px;
  position: relative;
}

.comparison__view {
  width: 100%;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;

  &.steps-grid--simple {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.step-card {
  background: rgba(23, 23, 23, 0.6);
  border: 1px solid #2b2b2b;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  transition: all 0.3s ease;
  animation: slideUp 0.5s ease-out backwards;
  backdrop-filter: blur(10px);

  &:hover {
    border-color: #404040;
    transform: translateY(-4px);
  }

  &--highlight {
    border-color: rgba(225, 0, 152, 0.3);
    background: rgba(225, 0, 152, 0.05);

    &:hover {
      border-color: #E10098;
    }
  }

  &--glow {
    box-shadow: 0 0 30px rgba(225, 0, 152, 0.2);
  }
}

.step-number {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #2b2b2b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #a9a9a9;

  &--highlight {
    background: rgba(225, 0, 152, 0.2);
    border-color: #E10098;
    color: #FF4DB8;
  }
}

.step-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.step-content {
  h4 {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: #a9a9a9;
    line-height: 1.6;
  }
}

.view-footer {
  text-align: center;
  padding: 24px;
  background: rgba(23, 23, 23, 0.4);
  border: 1px solid #2b2b2b;
  border-radius: 12px;
  backdrop-filter: blur(10px);

  &--success {
    border-color: rgba(19, 179, 81, 0.3);
    background: rgba(19, 179, 81, 0.05);
  }

  .footer-text {
    font-size: 16px;
    font-weight: 500;
    color: #a9a9a9;
  }
}

.comparison__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
