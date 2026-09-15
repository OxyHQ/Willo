// Redirects plain HTTP to HTTPS before falling through to the static asset
// serve. Cloudflare's zone-level "Always Use HTTPS" setting does this for
// free, but this zone doesn't have it enabled and this deployment's API
// token has no zone-settings write scope to turn it on — so the redirect
// lives here instead, at the one layer this deploy pipeline can actually
// change. `request.url` reflects the scheme the CLIENT used, not the
// (always-encrypted) hop from Cloudflare's edge to this Worker, so this sees
// a real `http://` request and not just Cloudflare's internal proxying.
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
