/** Page headings the build fills (schemas.md, "Pages and slots"). */
export const SLOTS = ['Transmissions', 'Media', 'Events', 'Research', 'Projects', 'Latest update', 'Updates'] as const
export type Slot = (typeof SLOTS)[number]
export const isSlot = (h: string): h is Slot => (SLOTS as readonly string[]).includes(h)
