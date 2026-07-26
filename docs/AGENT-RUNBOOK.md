# Runbook: Add OSLKS Radar tracking to a website

Instructions for an AI agent working **inside a website's repository**, tasked
with putting that site under Radar analytics.

Read the whole runbook before acting. Step 2 is the one that silently breaks
everything if skipped.

---

## 0. Inputs you need

| Input | Example | Where it comes from |
| --- | --- | --- |
| Radar API key | `oslks_a1b2c3d4_…` | Dashboard → Settings → API Keys. Ask the operator; never invent one |
| Site domain | `example.com` | The repo you are working in |
| Dashboard URL | `https://radar.slks.cz` | Fixed for this instance |
| Collector URL | `https://assets.slks.cz` | Fixed for this instance |

Export the key rather than pasting it into commands, so it stays out of shell
history and transcripts:

```bash
read -rs OSLKS_API_KEY && export OSLKS_API_KEY
```

**Never commit the API key.** It goes in the deployment platform's environment,
or in `.env.local` covered by `.gitignore`. It is not needed at runtime by the
tracked site at all — only by you, during setup.

---

## 1. Register the website → get its UUID

```bash
curl -sS -X POST https://radar.slks.cz/api/websites \
     -H "Authorization: Bearer $OSLKS_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"name":"Example Site","domain":"example.com"}'
```

`201` returns the created row. Take the `id` field — that UUID is the
`data-website-id` for step 3.

| Status | Meaning | What to do |
| --- | --- | --- |
| `201` | Created | Continue with the returned `id` |
| `400` | `domain` missing | Supply a non-empty `domain` |
| `401` | Key missing/malformed/revoked | Get a valid key from the operator |
| `403` | Out of the key's scope or wrong team | The key is pinned to one team; ask the operator |
| `409` | Domain already registered | Fetch the existing UUID instead — see below |

If the domain already exists, list what the key can see and pull the `id`:

```bash
curl -sS https://radar.slks.cz/api/websites \
     -H "Authorization: Bearer $OSLKS_API_KEY" \
  | jq -r '.[] | "\(.id)  \(.domain)"'
```

---

## 2. ⚠️ Whitelist the site's origin — **blocking, and not skippable**

The collector runs CORS in whitelist mode. The tracker posts
`application/json`, which forces a CORS preflight. If the site's origin is not
whitelisted, **the browser drops every hit before it leaves the page**: no
network error the site can catch, no server log, no events. The setup looks
completely fine and collects nothing.

Check the current state first:

```bash
curl -si -X OPTIONS https://assets.slks.cz/v1/p \
     -H 'Origin: https://example.com' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type' \
  | grep -i 'access-control-allow-origin'
```

- **Prints a header** → whitelisted, go to step 3.
- **Prints nothing** → blocked. The `200` on the preflight is meaningless; the
  absence of `access-control-allow-origin` is what matters.

**You almost certainly cannot fix this yourself** — it lives in the Radar
deployment's environment, not in this repo. Stop and tell the operator:

> `https://example.com` must be appended to `CORS_ALLOWED_ORIGINS` on the Radar
> app (Coolify → oslks/oslks-telemetry-radar → Environment Variables), then the
> app redeployed. Tracking cannot work until this is done.

Include both apex and `www` if both serve pages. Origins are scheme + host, no
trailing slash, comma-separated.

Do not proceed to "verified working" without this. Re-run the check after the
operator confirms the redeploy.

---

## 3. Install the snippet

Two required attributes:

| Attribute | Value |
| --- | --- |
| `data-website-id` | the UUID from step 1 |
| `data-host-url` | `https://assets.slks.cz` |

**`data-host-url` is not optional.** The tracker posts to
`<data-host-url>/v1/p`. Omit it and it falls back to the script's *directory*
(`…/lib/j` → `…/lib`), posting to `/lib/v1/p`, which 404s.

### Plain HTML

In `<head>` of every tracked page:

```html
<script src="https://assets.slks.cz/lib/j"
        data-website-id="PASTE-UUID-HERE"
        data-host-url="https://assets.slks.cz"></script>
```

### Next.js — App Router

In `app/layout.tsx`, as a literal tag (see the `currentScript` note below):

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <script
                    src="https://assets.slks.cz/lib/j"
                    data-website-id={process.env.NEXT_PUBLIC_OSLKS_WEBSITE_ID}
                    data-host-url={process.env.NEXT_PUBLIC_OSLKS_COLLECTOR_URL}
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
```

with, in the deployment environment:

```bash
NEXT_PUBLIC_OSLKS_COLLECTOR_URL=https://assets.slks.cz
NEXT_PUBLIC_OSLKS_WEBSITE_ID=<uuid-from-step-1>
```

`NEXT_PUBLIC_*` values are **baked in at build time** — changing them requires a
rebuild, not just a restart.

### Ad-blocker resistant variant

`assets.slks.cz` is already a neutral hostname. For a same-origin path instead,
the collector serves `/assets/v1/`-prefixed routes natively:

```html
<script src="https://radar.slks.cz/assets/v1/lib/j"
        data-website-id="PASTE-UUID-HERE"
        data-host-url="https://radar.slks.cz/assets/v1"></script>
```

Best results come from proxying `/assets/v1/*` through the tracked site's own
domain (Next.js rewrites, Nginx `proxy_pass`, Cloudflare Workers) — that also
sidesteps CORS entirely, since the request becomes same-origin. See the main
README's "Stealth Mode" section.

### `document.currentScript` caveat

The tracker reads its config via `document.currentScript`. Injecting it through
a tag manager, or any wrapper that runs it from a callback, leaves that `null`
and the script throws:

```
TypeError: Cannot read properties of null (reading 'getAttribute')
```

If you see that, replace the injection with a literal `<script>` tag in the
served HTML.

---

## 4. Verify — do not report success without this

Deploy the site, load a page in a real browser, then query the API. `start_at` /
`end_at` are optional, so bare `/stats` returns all-time totals:

```bash
curl -sS "https://radar.slks.cz/api/analytics/<WEBSITE_UUID>/stats" \
     -H "Authorization: Bearer $OSLKS_API_KEY"
```

`pageviews` greater than `0` means the pipeline works end to end. `0` after a
confirmed page load means something in steps 2–3 is wrong.

Browser-side check: DevTools → Network → filter `v1/p`. You want `POST` →
`202`/`200`. A red CORS error means step 2 was not completed.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No requests to `v1/p` at all | Script not on the page, or `data-website-id` missing (console warns `Setup failed`) | Confirm the tag is in the served HTML, not just the source |
| CORS error in console | Origin not whitelisted | Step 2 — operator must update `CORS_ALLOWED_ORIGINS` and redeploy |
| `404` on `…/lib/v1/p` | `data-host-url` missing | Add it explicitly |
| `TypeError … getAttribute of null` | Script injected dynamically | Use a literal `<script>` tag |
| Requests `202` but dashboard empty | Wrong `data-website-id` | Re-check the UUID against `GET /api/websites` |
| `401` from the API | Key revoked or malformed | Get a fresh key |
| SPA route changes not counted | Router bypasses History API | Rare; the tracker hooks `pushState`/`replaceState`/`popstate` |

---

## 6. What the tracker does and does not do

**Does:** pageview on load; SPA navigation via `pushState` / `replaceState` /
`popstate`; sends `url`, `referrer`, screen size, `navigator.language`; uses
`sendBeacon`, falling back to `fetch` with `keepalive`.

**Does not:** expose any public API — there is **no** `window.oslks.track(...)`.
The payload carries `event_name` / `event_data` fields, but nothing in the
shipped script can populate them. Do not write code that calls a custom-event
API; it does not exist. Custom events would require a change to the tracker
itself.

---

## 7. Rules

1. Never commit the API key, and never print it in output you keep.
2. Never invent a website UUID — it only comes from step 1's response.
3. Step 2 is blocking. If the origin is not whitelisted, say so plainly and stop
   rather than reporting the integration as done.
4. Do not change the Radar deployment from a website's repo.
5. Report verified reality: if you did not see `pageviews > 0`, say what you
   observed instead of assuming it works.
