/**
 * Global stacking (viewport-fixed overlays). Scene content uses auto / low z.
 */
/** Transparent layer: swipe-up to open config (home only). */
export const Z_HOME_GESTURE = 12

/** Idle / live orb — pointer-events none. */
export const Z_ORB_LAYER = 15

/** Session phase label — above orb, below chrome. */
export const Z_SESSION_LABEL = 16

/** Exit pill and top session chrome. */
export const Z_SESSION_CHROME = 18

/** Menu control on home screen. */
export const Z_HOME_MENU = 22

/** Config drawer backdrop. */
export const Z_CONFIG_BACKDROP = 68

/** Config drawer sheet (patterns, rounds, start). */
export const Z_CONFIG_DRAWER = 70

export const Z_FILM_GRAIN = 50

/** Session stats bottom sheet — above grain, over main scene. */
export const Z_BOTTOM_SHEET = 120
