<script setup lang="ts">
import CommunityCard, { type Testimonial } from './CommunityCard.vue'

const testimonials: Testimonial[] = [
  {
    name: 'Nitro Team',
    handle: '@unjsio',
    avatar:
      'https://avatars.githubusercontent.com/u/80154025?s=200&v=4',
    comment: [
      `Nitro GraphQL provides a seamless GraphQL integration that just works. The auto-discovery and type generation features make it incredibly easy to build type-safe GraphQL APIs.`,
    ],
  },
  {
    name: 'GraphQL Community',
    handle: '@graphql',
    avatar:
      'https://avatars.githubusercontent.com/u/12972006?s=200&v=4',
    comment: [
      `A fantastic tool that brings the power of GraphQL to Nitro applications with zero configuration needed.`,
    ],
  },
  {
    name: 'Nuxt Community',
    handle: '@nuxt_js',
    avatar:
      'https://avatars.githubusercontent.com/u/23360933?s=200&v=4',
    comment: [
      'Nitro GraphQL makes adding GraphQL to Nuxt applications a breeze. The type generation works perfectly with our setup.',
    ],
  },
  {
    name: 'Developer',
    handle: '@developer',
    avatar:
      'https://avatars.githubusercontent.com/u/1?s=200&v=4',
    comment: [
      `The auto-discovery feature is game-changing. No more manual schema stitching or complex setup. Just drop your .graphql files and you're ready to go.`,
    ],
  },
  {
    name: 'Full Stack Dev',
    handle: '@fullstack',
    avatar:
      'https://avatars.githubusercontent.com/u/2?s=200&v=4',
    comment: [
      `Type generation for both server and client is incredibly powerful. Our frontend and backend teams love the type safety it provides.`,
    ],
  },
  {
    name: 'Tech Lead',
    handle: '@techlead',
    avatar:
      'https://avatars.githubusercontent.com/u/3?s=200&v=4',
    comment: ['Nitro GraphQL has significantly improved our development workflow and code quality.'],
  },
]
</script>

<template>
  <section class="community-section">
    <h2>Loved by developers</h2>
    <h3>
      Don't take our word for it - see what developers are saying about Nitro GraphQL.
    </h3>
    <div class="community-grid-container">
      <div class="community-grid">
        <CommunityCard
          :testimonial="testimonial"
          v-for="testimonial in testimonials"
          :key="testimonial.name"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.community-section {
  margin-top: 140px;
  display: none;

  @media (min-width: 768px) {
    display: block;
  }

  h2 {
    background: linear-gradient(0deg, #fff 0%, rgba(255, 255, 255, 0.76) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 auto 10px;
    text-align: center;
  }

  h3 {
    width: 455px;
    max-width: 100%;
    margin: 0 auto;
    text-align: center;
  }

  .community-grid-container {
    position: relative;
  }

  .community-grid {
    column-count: 2;
    column-gap: 25px;
    width: calc(100% - 50px);
    margin: 40px auto 0;

    @media (min-width: 1150px) {
      column-count: 3;
      width: 1100px;
    }
  }
}
</style>
