function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

// hex色を白(正の値)または黒(負の値)に向けて混ぜて、濃淡違いのバリエーションを作る
export function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = percent >= 0 ? 255 : 0
  const p = Math.abs(percent)
  const nr = clamp(r + (mix - r) * p)
  const ng = clamp(g + (mix - g) * p)
  const nb = clamp(b + (mix - b) * p)
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const SEGMENT_SHADE_STEPS = [0, -0.28, 0.32, -0.5, 0.5]

export function segmentColor(base: string, index: number): string {
  const step = SEGMENT_SHADE_STEPS[index % SEGMENT_SHADE_STEPS.length]
  return shade(base, step)
}
