import { onMounted, onUnmounted, ref } from 'vue'
import voidZeroSvg from './images/voidzero.svg'
import boltSvg from './images/bolt.svg'
import nuxtLabsSvg from './images/nuxtlabs.svg'

interface Sponsors {
  special: Sponsor[]
  platinum: Sponsor[]
  platinum_china: Sponsor[]
  gold: Sponsor[]
  silver: Sponsor[]
  bronze: Sponsor[]
}

interface Sponsor {
  name: string
  img: string
  url: string
  /**
   * Expects to also have an **inversed** image with `-dark` postfix.
   */
  hasDark?: true
}

// shared data across instances so we load only once.
const data = ref<{ tier: string; size: string; items: Sponsor[] }[]>()

const dataHost = 'https://sponsors.vuejs.org'
const dataUrl = `${dataHost}/vite.json`

export const voidZero = {
  name: 'VoidZero',
  url: 'https://voidzero.dev',
  img: voidZeroSvg,
} satisfies Sponsor

const nitroGraphQLSponsors: Pick<Sponsors, 'special' | 'gold'> = {
  special: [
    // Main sponsors - can be updated with actual sponsors
    {
      name: 'NuxtLabs',
      url: 'https://nuxtlabs.com',
      img: nuxtLabsSvg,
    },
  ],
  gold: [
    // Gold sponsors - can be updated
  ],
}

function toggleDarkLogos() {
  if (data.value) {
    const isDark = document.documentElement.classList.contains('dark')
    data.value.forEach(({ items }) => {
      items.forEach((s: Sponsor) => {
        if (s.hasDark) {
          s.img = isDark
            ? s.img.replace(/(\.\w+)$/, '-dark$1')
            : s.img.replace(/-dark(\.\w+)$/, '$1')
        }
      })
    })
  }
}

export function useSponsor() {
  onMounted(async () => {
    const ob = new MutationObserver((list) => {
      for (const m of list) {
        if (m.attributeName === 'class') {
          toggleDarkLogos()
        }
      }
    })
    ob.observe(document.documentElement, { attributes: true })
    onUnmounted(() => {
      ob.disconnect()
    })

    if (data.value) {
      return
    }

    const result = await fetch(dataUrl)
    const json = await result.json()

    data.value = mapSponsors(json)
    toggleDarkLogos()
  })

  return {
    data,
  }
}

function mapSponsors(sponsors: Sponsors) {
  return [
    {
      tier: 'Special Thanks',
      size: 'big',
      items: nitroGraphQLSponsors['special'],
    },
    {
      tier: 'Platinum Sponsors',
      size: 'big',
      items: mapImgPath(sponsors['platinum']),
    },
    {
      tier: 'Gold Sponsors',
      size: 'medium',
      items: [...mapImgPath(sponsors['gold']), ...nitroGraphQLSponsors['gold']],
    },
  ]
}

const nitroGraphQLSponsorNames = new Set(
  Object.values(nitroGraphQLSponsors).flatMap((sponsors) =>
    sponsors.map((s) => s.name),
  ),
)

/**
 * Map Vue/Vite sponsors data to objects and filter out Nitro GraphQL-specific sponsors
 */
function mapImgPath(sponsors: Sponsor[]) {
  return sponsors
    .filter((sponsor) => !nitroGraphQLSponsorNames.has(sponsor.name))
    .map((sponsor) => ({
      ...sponsor,
      img: `${dataHost}/images/${sponsor.img}`,
    }))
}
