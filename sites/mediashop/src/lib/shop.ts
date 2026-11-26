import { loadOuterMind, siteBase, shopItems, type ShopItem } from '@om/content'

export const om = () => loadOuterMind()

/** Hub title, shown uppercase as the header kicker and footer link (old: "the Open Machine"). */
export function hubTitle() {
  return om().site?.data.sites.find((s) => s.name.toLowerCase() === 'hub')?.title ?? 'The Open Machine'
}
export const hubUrl = () => siteBase(om(), 'hub')

/**
 * Donate link: the x402 wallet flow stays on a separate server (decided 2026-11-26). Set its URL with
 * OM_SHOP_DONATE_URL; until then the link falls back to the hub's /donate page. See DECISIONS.md.
 */
export const donateUrl = () => process.env.OM_SHOP_DONATE_URL || `${hubUrl()}/donate`

let itemsPromise: Promise<ShopItem[]> | undefined
let itemsFor: unknown
export function items(): Promise<ShopItem[]> {
  const o = om()
  if (itemsFor !== o) {
    itemsFor = o
    itemsPromise = shopItems(o)
  }
  return itemsPromise!
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "2026-07-06" → "July 6, 2026", as the old shop showed dates. */
export function longDate(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}
export const LANGUAGES: Record<string, string> = { en: 'English' }
