import { useId } from 'react'

import { Z_FILM_GRAIN } from '../constants/layers'

/** Full-viewport grain via SVG fractalNoise; breaks up gradient banding when blended. */
const GRAIN_OPACITY = 0.04

export const FilmGrainOverlay = () => {
  const filterId = `film-grain-${useId().replace(/:/g, '')}`

  return (
    <>
      <svg className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden>
        <defs>
          <filter
            id={filterId}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.72"
              numOctaves="3"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          </filter>
        </defs>
      </svg>
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          zIndex: Z_FILM_GRAIN,
          opacity: GRAIN_OPACITY,
          mixBlendMode: 'overlay',
          filter: `url(#${filterId})`,
          backgroundColor: '#fff',
          transform: 'translateZ(0)',
        }}
      />
    </>
  )
}
