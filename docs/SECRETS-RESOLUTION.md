# Secrets — investigation and resolution

**Date:** 2026-08-03 · **Status:** resolved · **Verdict: DELETE, not rotate**

Two concerns were raised: `VITE_MAPTILER_API_KEY` present with two different
live-looking values, and `VITE_API_URL=https://api.org` pointing at a third-party
domain. The instruction was to establish what MapTiler is actually used for before
choosing delete-versus-rotate.

The investigation changed the plan, so the findings come first.

---

## 1. There is no local git history

```
$ ls -d .git          → not found
$ git rev-parse --is-inside-work-tree
  fatal: not a git repository (or any of the parent directories): .git
```

The working tree is not a git repository. **The keys were never committed by
ADD**, so "they are in git history" does not hold here. They may exist in the
upstream Pinx repository's history — see §2 — but that is the template vendor's
repository, not ADD's.

## 2. The keys are the template vendor's, not ADD's

| File | Timestamp |
|---|---|
| `.env` | 2026-06-11 19:04 |
| `.env.production` | 2026-06-11 19:04 |
| `.env.sample` | 2026-06-11 19:04 |
| `.gitignore` | 2026-06-11 19:04 |

All four share the timestamp of the Pinx template import. The keys **arrived with
the template**, carrying the template author's MapTiler credentials — a different
key in `.env` than in `.env.production`, which is itself the signature of a
vendor's own dev/prod pair rather than anything provisioned for ADD.

**This is why revocation was not the action: ADD has no MapTiler account to revoke
them from.** Revoking someone else's credential is not ADD's to do, and rotation
only helps if something still needs a key — which brings us to §3.

## 3. Nothing in ADD OS ever read it

The only reader:

```
src/components/maps/maplibre/Map.vue:42
  const mapTilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY
```

Reachability:

```
components/maps/maplibre/Map.vue   ← consumed only by …
views/Maps/MapLibre.vue            ← an UNROUTED Pinx demo page
```

ADD OS's router is built from `add-os/navigation/sections.ts` and reaches no map
page. Confirmed against a clean build:

```
$ grep -rl "api.maptiler.com" dist/    → no matches
```

The host never appeared in an emitted artifact. An unused live credential is pure
liability, so it was deleted rather than rotated.

## 4. The real exposure surface was `.gitignore`

```
# before
.env
```

`.env` does **not** match `.env.production`. So the file carrying the second key
was committable while the first was ignored — the gap, not the key, was the defect.

```
# after
.env
.env.*
!.env.example
```

---

## What changed

| Change | File |
|---|---|
| `VITE_MAPTILER_API_KEY` deleted; both key values gone from the working tree | `.env`, `.env.production` |
| `VITE_API_URL=https://api.org` removed — **no fallback replaces it** | `.env`, `.env.production` |
| Every env file ignored, `.env.example` the sole exception | `.gitignore` |
| Documented template with empty values + required-variable notes | `.env.example` **(new)** |
| Removed — two files claiming one job is how one goes stale | `.env.sample` **(deleted)** |
| Startup guard: throws in production when `VITE_API_URL` is unset, warns in development, **never substitutes a host** | `src/add-os/config/env.ts` **(new)** |
| `assertEnv()` runs before mount | `src/main.ts` |
| Secret-scanning guard, allowlist as data with enforced justifications | `src/add-os/__tests__/no-secrets.spec.ts` **(new)** |
| Key fragments scrubbed — quoting part of a credential is the same mistake, smaller | `docs/PHASE-3-DEAD-CONTROLS.md` |

### `VITE_API_URL` — why production throws and development warns

An unset API base that silently resolves to somebody else's host is an
exfiltration path, not a typo. There is therefore **no default, ever**:

- **Production build, unset** → `assertEnv()` throws. A misconfigured deployment must not start.
- **Development, unset** → loud warning, app continues. ADD OS has no API layer yet, and a hard throw would block work on screens that make no requests.
- **Either mode** → `apiUrl()` throws at the call site when unset, so the first request written cannot inherit a default.

The real internal host is still needed. Set `VITE_API_URL` in `.env`, and tighten
`assertEnv()` to an unconditional throw once the API layer lands.

### What the guard enforces

`no-secrets.spec.ts`, sibling to `no-external-urls.spec.ts`:

- committed env files must declare secret-shaped keys with **empty** values;
- nothing credential-shaped in `src/add-os`, `scripts`, or `docs`;
- `.gitignore` must contain `.env`, `.env.*`, and `!.env.example` — asserted as
  patterns, because trusting a bare `.env` line is what created this;
- `.env.sample` must not reappear beside `.env.example`;
- allowlist starts **empty**, and every future entry needs a justification.

Generated files are skipped, and only generated files: `icons.generated.json`
holds SVG path geometry, which is credential-shaped by construction and cannot be
reworded. A credential cannot originate in a generated file, and the source it is
generated from is scanned.

---

## Still open — for whoever owns infrastructure

1. **Set the real `VITE_API_URL`.** Currently empty; production will refuse to start.
2. **Optional courtesy:** the template vendor's MapTiler keys were exposed in a
   publicly sold template. Worth telling them. Not ADD's to revoke.
3. **`maplibre-gl` remains a dependency.** If maps are ever needed it works against
   a self-hosted tile server — no third-party key, no external host. `api.maptiler.com`
   is unreachable from an isolated network regardless.
