<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSlideIn } from '../../../composables/useSlideIn'
import { codeToHtml } from 'shiki'

useSlideIn('#code-examples')

type Tab = 'schema' | 'resolver' | 'query' | 'response'

const activeTab = ref<Tab>('schema')
const copied = ref(false)
const highlightedCode = ref<Record<Tab, string>>({
  schema: '',
  resolver: '',
  query: '',
  response: '',
})

const tabs: { id: Tab; label: string }[] = [
  { id: 'schema', label: 'Schema' },
  { id: 'resolver', label: 'Resolver' },
  { id: 'query', label: 'Query' },
  { id: 'response', label: 'Response' },
]

const codeExamples: Record<Tab, { code: string; language: string }> = {
  schema: {
    code: `# server/graphql/user.graphql

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}`,
    language: 'graphql'
  },
  resolver: {
    code: `// server/graphql/user.resolver.ts

export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    return await context.storage.getItem(\`users:\${id}\`)
  },
  users: async (_, __, context) => {
    return await context.storage.getKeys('users:')
  },
})`,
    language: 'typescript'
  },
  query: {
    code: `# app/graphql/getUser.graphql

query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
    }
  }
}`,
    language: 'graphql'
  },
  response: {
    code: `// Fully typed response!

import type { GetUserQuery } from '#graphql/client'

const { data } = await useAsyncData(() =>
  $fetch<GetUserQuery>('/api/graphql', {
    method: 'POST',
    body: { query: GetUserDocument }
  })
)

// data.user is fully typed ✓`,
    language: 'typescript'
  },
}

onMounted(async () => {
  // Highlight all code examples using Shiki
  for (const [key, value] of Object.entries(codeExamples)) {
    const html = await codeToHtml(value.code, {
      lang: value.language === 'graphql' ? 'graphql' : 'typescript',
      theme: 'one-dark-pro',
      colorReplacements: {
        '#282c34': '#1e1e1e', // Replace One Dark Pro bg with darker color
      }
    })
    highlightedCode.value[key as Tab] = html
  }
})

function copyCode() {
  const code = codeExamples[activeTab.value].code
  navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

const currentHighlightedCode = computed(() => {
  return highlightedCode.value[activeTab.value] || ''
})
</script>

<template>
  <section id="code-examples" class="code-examples">
    <div class="code-examples__container">
      <div class="code-examples__header">
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
            stroke="url(#linear-gradient-code)"
            stroke-width="2"
          />
          <defs>
            <linearGradient
              id="linear-gradient-code"
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
        <h2>Experience the power</h2>
        <p>From GraphQL schema to fully-typed resolvers and queries in seconds</p>
      </div>

      <div class="code-examples__content">
        <div class="code-examples__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="code-examples__code">
          <button class="copy-btn" @click="copyCode">
            <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="#13b351" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
          <div class="shiki-wrapper" v-html="currentHighlightedCode"></div>
        </div>
      </div>

      <div class="code-examples__glow"></div>
    </div>
  </section>
</template>

<style scoped>
.code-examples {
  width: 100%;
  padding: 120px 24px;
  position: relative;
  background: linear-gradient(180deg, transparent 0%, rgba(225, 0, 152, 0.03) 50%, transparent 100%);
}

.code-examples__container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.code-examples__header {
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

.code-examples__content {
  background: #1a1a1a;
  border: 1px solid rgba(225, 0, 152, 0.2);
  border-radius: 24px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(225, 0, 152, 0.1);
}

.code-examples__tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #2b2b2b;
  padding: 0;
  background: transparent;

  @media (max-width: 640px) {
    overflow-x: auto;
  }
}

.tab {
  flex: 1;
  padding: 16px 24px;
  background: transparent;
  border: none;
  color: #a9a9a9;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-width: 120px;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #E10098;
    transform: scaleX(0);
    transition: transform 0.2s ease;
  }

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.03);
  }

  &.active {
    color: #FF4DB8;

    &::after {
      transform: scaleX(1);
    }
  }

  @media (max-width: 640px) {
    font-size: 14px;
    padding: 14px 16px;
    min-width: 100px;
  }
}

.code-examples__code {
  position: relative;
  padding: 0;
  min-height: 380px;
  background: #1e1e1e;
  overflow: hidden;

  @media (max-width: 640px) {
    min-height: 320px;
  }

  .shiki-wrapper {
    padding: 32px 36px;
    overflow-x: auto;

    @media (max-width: 640px) {
      padding: 24px 20px;
    }

    :deep(pre) {
      margin: 0 !important;
      padding: 0 !important;
      font-size: 15px !important;
      line-height: 1.9 !important;

      @media (max-width: 640px) {
        font-size: 13px !important;
        line-height: 1.7 !important;
      }
    }

    :deep(code) {
      font-family: 'Fira Code', 'Consolas', 'Monaco', monospace !important;
      background: transparent !important;
    }
  }
}

.copy-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(225, 0, 152, 0.1);
  border: 1px solid rgba(225, 0, 152, 0.3);
  border-radius: 10px;
  color: #FF4DB8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(225, 0, 152, 0.2);
    border-color: #E10098;
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(225, 0, 152, 0.3);
  }
}

.code-examples__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(225, 0, 152, 0.1) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
</style>
