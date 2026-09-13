import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { getWeatherIconBucket, type WeatherIconBucket } from '../utils/weatherIconBucket'

interface IconLayerConfig {
  sun: boolean
  cloud: boolean
  rain: boolean
  /** Desaturates the cloud layers for the stormier buckets. */
  greyscaleCloud: boolean
}

const LAYERS_BY_BUCKET: Record<WeatherIconBucket, IconLayerConfig> = {
  clear: { sun: true, cloud: true, rain: false, greyscaleCloud: false },
  'few-clouds': { sun: true, cloud: true, rain: false, greyscaleCloud: false },
  'scattered-clouds': { sun: false, cloud: true, rain: false, greyscaleCloud: false },
  'broken-clouds': { sun: false, cloud: true, rain: false, greyscaleCloud: true },
  'shower-or-thunderstorm': { sun: false, cloud: true, rain: true, greyscaleCloud: true },
  rain: { sun: true, cloud: true, rain: true, greyscaleCloud: false },
  other: { sun: true, cloud: true, rain: false, greyscaleCloud: false },
}

/**
 * Tailwind filter utilities applied to `cloud.svg`/`cloud-shadow.svg` for
 * the "greyer" stormy look requested for the broken-clouds/shower-rain/
 * thunderstorm buckets. Done as a CSS filter rather than hand-editing the
 * source SVGs' gradient stops — cheaper to tune later and applies
 * identically to both cloud layers without touching the asset files.
 */
const GREYSCALE_CLOUD_CLASS = 'grayscale-[70%] saturate-[40%] brightness-95'

/**
 * Tailwind opacity utility applied to the normal-color ("clear") cloud
 * variant — i.e. every bucket where `greyscaleCloud` is false. The cloud's
 * own pixels stay fully opaque/sharp here; a sun rendered behind it is kept
 * visible instead via the separate `backdrop-blur` mask layer below
 * (`shouldRenderCloudBlurMask`), not by fading or blurring the cloud image
 * itself.
 */
const CLEAR_CLOUD_CLASS = 'opacity-100'

/** Duration of the fade+scale intro tween, in seconds. See `INTRO_EASE`. */
const INTRO_DURATION = 0.45
const INTRO_EASE = 'power2.out'

interface WeatherIconProps {
  /** OpenWeatherMap's longer condition description, e.g. "scattered clouds". */
  description: string
  className?: string
}

/**
 * Layered, animated weather icon: sun / cloud / rain-drop SVG art stacked
 * per the mapping in `getWeatherIconBucket` and driven by GSAP. Purely
 * decorative — the only current consumer (`WeatherResult`) already renders
 * `condition`/`description` as visible/`sr-only` text in the same card, so
 * every layer here is `alt=""`.
 *
 * Animation is a plain looping `gsap` timeline scoped to this component
 * (not `ScrollTrigger`/Lenis — this isn't scroll-linked), gated behind
 * `prefers-reduced-motion` and cleaned up via `gsap.context().revert()` on
 * unmount/bucket change.
 *
 * Because the effect is keyed on `bucket`, switching search results (e.g.
 * clear -> rainy for a new city) tears down and re-runs it. Rather than
 * just snapping to the new layer set, every run first plays a short
 * fade+scale-in "intro" across every layer (`INTRO_DURATION`), then starts
 * the idle loops only once that intro has finished — the two never fight
 * over the same `opacity`/`scale` properties on the same elements, and a
 * bucket change reads as an intentional cross-fade rather than a jump cut.
 * Reduced motion skips both the intro and the idle loops entirely: layers
 * simply render at their resting opacity/scale immediately.
 */
export function WeatherIcon({ description, className }: WeatherIconProps) {
  const bucket = getWeatherIconBucket(description)
  const layers = LAYERS_BY_BUCKET[bucket]
  const containerRef = useRef<HTMLDivElement>(null)
  // Only meaningful when something (the sun) actually renders behind the
  // cloud and the cloud itself isn't the desaturated stormy variant — a
  // greyscale/no-sun bucket has nothing worth blurring back there.
  const shouldRenderCloudBlurMask = layers.sun && layers.cloud && !layers.greyscaleCloud

  useEffect(() => {
    const container = containerRef.current
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const ctx = gsap.context(() => {
      // Excludes rain drops: each drop's own per-drop timeline below is
      // solely responsible for its opacity from the very start (it already
      // starts at 0 with nothing else touching it). Including rain drops
      // here too meant this tween drove them to opacity 1 by `INTRO_DURATION`,
      // and then each drop's delayed timeline snapped them back to 0 when it
      // started — a visible "blink" repeated once per drop as their staggered
      // delays elapsed.
      const introLayers = container.querySelectorAll<HTMLElement>(
        '[data-icon-layer]:not([data-icon-layer="rain-drop"])',
      )
      const sunLayers = container.querySelectorAll<HTMLElement>('[data-icon-layer="sun"]')
      const cloudLayers = container.querySelectorAll<HTMLElement>('[data-icon-layer="cloud"]')
      const rainDrops = container.querySelectorAll<HTMLElement>('[data-icon-layer="rain-drop"]')

      // Intro: every non-rain-drop layer currently on screen for this bucket
      // fades and scales in together (a subtle per-layer stagger keeps it
      // from feeling like a single flat cross-fade).
      gsap.fromTo(
        introLayers,
        { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: INTRO_DURATION, ease: INTRO_EASE, stagger: 0.04 },
      )

      if (sunLayers.length > 0) {
        // Gentle glow pulse: sun.svg is a plain filled circle, so a
        // rotation loop would be visually indistinguishable from doing
        // nothing — a slow scale/opacity breathe reads as "glowing" instead.
        // Delayed until the intro finishes so both tweens don't animate
        // the same elements' opacity/scale at once.
        gsap.to(sunLayers, {
          scale: 1.06,
          opacity: 0.9,
          transformOrigin: '50% 50%',
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: INTRO_DURATION,
        })
      }

      if (cloudLayers.length > 0) {
        // Slow horizontal drift loop ("cloud passing by"); cloud + its
        // shadow move together as one unit.
        gsap.to(cloudLayers, {
          x: '6%',
          duration: 5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: INTRO_DURATION,
        })
      }

      // Staggered falling loop, offset per drop so they don't fall in
      // sync. The vertical fall is a single, uninterrupted tween across the
      // whole `-30% -> 130%` distance with one easing curve — fade-in and
      // fade-out are separate `opacity` tweens positioned at absolute
      // offsets that overlap the fall rather than chained after it, so nothing
      // restarts the position tween's velocity partway through (which
      // previously read as a visible stutter at the fade handoff point).
      rainDrops.forEach((drop, index) => {
        gsap
          .timeline({ repeat: -1, repeatDelay: 0.35, delay: INTRO_DURATION + index * 0.28 })
          .fromTo(drop, { y: '0%' }, { y: '80%', duration: 0.9, ease: 'power1.in' }, 0)
          .fromTo(drop, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'sine.out' }, 0)
          .to(drop, { opacity: 0, duration: 0.25, ease: 'sine.in' }, 0.65)
      })
    }, container)

    return () => ctx.revert()
  }, [bucket])

  return (
    <div ref={containerRef} className={className}>
      {/*
        `-translate-y-[8%]` shifts the whole composition up within its
        bounding box: with the cloud/rain raised closer to the sun (below),
        the group's total visual height no longer fills the box, leaving it
        sitting low — this nudges it back toward vertical center.
      */}
      <div className="relative h-full w-full -translate-y-[8%]">
        {layers.sun && (
          <div className="absolute top-0 right-0 h-[68%] w-[68%]">
            <img
              src="/sun-shadow.svg"
              alt=""
              data-icon-layer="sun"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <img
              src="/sun.svg"
              alt=""
              data-icon-layer="sun"
              className="absolute inset-[15%] h-[70%] w-[70%] object-contain"
            />
          </div>
        )}

        {layers.cloud && (
          <div className="absolute inset-x-[-10%] bottom-[16%] h-[68%] w-full">
            {shouldRenderCloudBlurMask && (
              // Blurs whatever's rendered behind the cloud (the sun) rather
              // than the cloud's own pixels: `backdrop-filter` samples the
              // backdrop, not this element's content, so the cloud stays
              // sharp. Sized/positioned identically to the actual `cloud.svg`
              // `<img>` below and clipped to that same asset via
              // `mask-image` so the blur reads as shaped to the cloud's
              // silhouette instead of a blurred rectangle behind it. Shares
              // `data-icon-layer="cloud"` with the sharp cloud images so it
              // fades in and drifts together with them.
              <div
                aria-hidden="true"
                data-icon-layer="cloud"
                data-cloud-blur-mask=""
                className="absolute inset-[5%] h-[90%] w-[90%] backdrop-blur-md [mask-image:url('/cloud.svg')] [-webkit-mask-image:url('/cloud.svg')] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-size:contain] [mask-position:center] [-webkit-mask-position:center]"
              />
            )}
            <img
              src="/cloud-shadow.svg"
              alt=""
              data-icon-layer="cloud"
              className={`absolute inset-0 mt-10 h-full w-full object-contain ${layers.greyscaleCloud ? GREYSCALE_CLOUD_CLASS : CLEAR_CLOUD_CLASS}`}
            />
            <img
              src="/cloud.svg"
              alt=""
              data-icon-layer="cloud"
              className={`absolute inset-[5%] h-[90%] w-[90%] object-contain ${layers.greyscaleCloud ? GREYSCALE_CLOUD_CLASS : CLEAR_CLOUD_CLASS}`}
            />
          </div>
        )}

        {layers.rain && (
          <div className="absolute inset-x-[24%] bottom-[20%] flex h-[34%] items-start justify-end gap-x-5 pr-3">
            <img src="/rain-drop-1.svg" alt="" data-icon-layer="rain-drop" className="w-[10%] h-auto" />
            <img src="/rain-drop-2.svg" alt="" data-icon-layer="rain-drop" className="mt-2 w-[10%] h-auto" />
            <img src="/rain-drop-3.svg" alt="" data-icon-layer="rain-drop" className="w-[10%] h-auto" />
          </div>
        )}
      </div>
    </div>
  )
}
