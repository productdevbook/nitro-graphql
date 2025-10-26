<script setup lang="ts">
import { ref } from 'vue'
import { useSlideIn } from '../../../composables/useSlideIn'

useSlideIn('#ecosystem')

interface Integration {
  name: string
  logo: string
  description: string
  color: string
}

const integrations: Integration[] = [
  {
    name: 'Nitro',
    logo: '⚗️',
    description: 'Built on Nitro for blazing-fast server performance',
    color: '#00DC82',
  },
  {
    name: 'Nuxt',
    logo: '💚',
    description: 'First-class Nuxt integration with automatic type generation',
    color: '#00DC82',
  },
  {
    name: 'H3',
    logo: '🔷',
    description: 'Powered by H3 event context for seamless server integration',
    color: '#41B8C4',
  },
  {
    name: 'GraphQL Yoga',
    logo: '🧘',
    description: 'Default GraphQL server with powerful features',
    color: '#E10098',
  },
  {
    name: 'Apollo Server',
    logo: '🚀',
    description: 'Apollo Server support with federation capabilities',
    color: '#3F20BA',
  },
  {
    name: 'TypeScript',
    logo: '📘',
    description: 'End-to-end type safety with automatic type generation',
    color: '#3178C6',
  },
]

const hoveredCard = ref<number | null>(null)
</script>

<template>
  <section id="ecosystem" class="ecosystem">
    <div class="ecosystem__container">
      <div class="ecosystem__header">
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
            stroke="url(#linear-gradient-ecosystem)"
            stroke-width="2"
          />
          <defs>
            <linearGradient
              id="linear-gradient-ecosystem"
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
        <h2>Built on modern tools</h2>
        <p>Integrates seamlessly with the ecosystem you already love</p>
      </div>

      <div class="ecosystem__grid">
        <div
          v-for="(integration, index) in integrations"
          :key="integration.name"
          class="integration-card"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @mouseenter="hoveredCard = index"
          @mouseleave="hoveredCard = null"
        >
          <div class="integration-card__glow" :class="{ active: hoveredCard === index }"></div>
          <div class="integration-logo">{{ integration.logo }}</div>
          <h3 class="integration-name">{{ integration.name }}</h3>
          <p class="integration-description">{{ integration.description }}</p>
          <div class="integration-indicator" :style="{ background: integration.color }"></div>
        </div>
      </div>

      <div class="ecosystem__footer">
        <div class="footer-content">
          <h3>Works with your stack</h3>
          <p>Nitro GraphQL is framework-agnostic and integrates with any Nitro or Nuxt application</p>
          <a href="/guide/quick-start-nitro" class="footer-link">
            Get started
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>

      <div class="ecosystem__glow"></div>
    </div>
  </section>
</template>

<style scoped>
.ecosystem {
  width: 100%;
  padding: 120px 24px;
  position: relative;
  background: linear-gradient(180deg, transparent 0%, rgba(225, 0, 152, 0.02) 50%, transparent 100%);
}

.ecosystem__container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.ecosystem__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 80px;
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
      #E10098 0%,
      #ffffff 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow:
      0 0 4px rgba(255, 255, 255, 0.1),
      0 0 14px rgba(225, 0, 152, 0.2);

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

.ecosystem__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 80px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.integration-card {
  position: relative;
  background: rgba(23, 23, 23, 0.6);
  border: 1px solid #2b2b2b;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out backwards;
  backdrop-filter: blur(10px);
  overflow: hidden;

  &:hover {
    border-color: #404040;
    transform: translateY(-8px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }
}

.integration-card__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(225, 0, 152, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;

  &.active {
    opacity: 1;
  }
}

.integration-logo {
  font-size: 56px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.integration-name {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.integration-description {
  font-size: 15px;
  color: #a9a9a9;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
}

.integration-indicator {
  width: 40px;
  height: 4px;
  margin: 0 auto;
  border-radius: 2px;
  position: relative;
  z-index: 1;
}

.ecosystem__footer {
  text-align: center;
  padding: 48px 32px;
  background: rgba(23, 23, 23, 0.6);
  border: 1px solid #2b2b2b;
  border-radius: 24px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #E10098, transparent);
  }
}

.footer-content {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;

  h3 {
    font-size: 28px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12px;

    @media (max-width: 768px) {
      font-size: 24px;
    }
  }

  p {
    font-size: 16px;
    color: #a9a9a9;
    line-height: 1.6;
    margin-bottom: 24px;

    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #E10098, #FF4DB8);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;

  svg {
    transition: transform 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(225, 0, 152, 0.4);

    svg {
      transform: translateX(4px);
    }
  }
}

.ecosystem__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(225, 0, 152, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
