/**
 * The browser origins Willo's API admits, on HTTP (`createOxyCors` in
 * `app.ts`) and on Socket.IO (`createOxySocketCors` in `server.ts`) alike: one
 * list, so the two transports cannot drift. `@oxy.so/core` adds Oxy's own HTTPS
 * family (`https://oxy.so`, `https://<one-label>.oxy.so`) by itself, and every
 * other origin is refused: no reflection, never a wildcard. The Home Assistant
 * integration and the native apps send no `Origin` and need no entry.
 *
 * Code, not configuration: which sites may call Willo with a user's session is
 * part of Willo, so a deploy cannot widen it.
 */

/** The Willo web app and Frame by Willo's web build (also what a Chromecast loads). */
const WILLO_WEB_ORIGINS = ['https://willo.sh', 'https://frame.willo.sh'];

/** The Expo web dev servers, pinned in each package's `package.json`: the app and the frame. */
const DEVELOPMENT_ORIGINS = ['http://localhost:19006', 'http://localhost:19016'];

export const WILLO_APP_ORIGINS: readonly string[] = [...WILLO_WEB_ORIGINS, ...DEVELOPMENT_ORIGINS];
