# Releasing a new version

Publishing runs in GitHub Actions. There is **no npm token** anywhere — not on
your machine, not in a repository secret. npm trusts this repo and
[`publish.yml`](.github/workflows/publish.yml) by name, and the runner proves it
is them with a short-lived OIDC token minted for that one run. Nothing
long-lived exists to leak, expire, or rotate.

That is also where the green **Built and signed with provenance** badge on the
npm page comes from: a signed record of which repo and commit the tarball was
built from, checked against a public transparency log. It is automatic on this
path, which is why `--provenance` is not passed anywhere.

---

## The four steps

Run these from the `web` folder.

**1. Bump the version.** Pick one:

```bash
npm version patch
```

`patch` 0.1.2 → 0.1.3 for fixes. `minor` → 0.2.0 for new features that don't
break anything. `major` → 1.0.0 for changes that break existing users.

This edits `package.json`, makes a commit, and tags it — all three. You do not
edit the version by hand.

**2. Push the commit *and the tag*:**

```bash
git push --follow-tags
```

`--follow-tags` matters. A plain `git push` leaves the tag behind on your
machine, and step 3 will not be able to find it.

**3. Draft the release.** On GitHub: **Releases → Draft a new release →
Choose a tag** → pick the `v0.1.3` you just pushed → **Publish release**.

**4. Watch it.** The **Actions** tab shows the run. It takes about a minute.

Then check [npmjs.com/package/lerpa](https://www.npmjs.com/package/lerpa):
the new version is listed, and hovering the green tick next to it says *Built and
signed with provenance*.

---

## What the workflow does

1. Checks out the tag.
2. Installs Node 24 and upgrades npm — trusted publishing needs npm ≥ 11.5.1 and
   Node ≥ 22.14, and the runner image is not guaranteed to be new enough.
3. Runs `npm test`, which imports the package on Node with **no DOM**. That
   catches a broken export map, and anything reaching for `HTMLElement` at module
   scope — the failure that breaks server rendering in Nuxt or Next before a
   component ever runs.
4. **Refuses to continue if the tag and `package.json` disagree.** Publishing a
   mislabelled version cannot be undone, so this is worth the extra step.
5. Publishes.

`prepublishOnly` in `package.json` runs the same check again as a backstop, so
even a hand publish cannot ship a package that fails to import.

---

## Things that will trip you up

**PowerShell has no `&&`.** `git add -A && git commit -m "..."` is a parser
error in Windows PowerShell 5.1. Run the commands on separate lines, or use
`A; if ($?) { B }`.

**Running `npm version` twice.** It bumps twice — 0.1.1 *and* 0.1.2, two commits
and two tags. Nothing is broken; just release the higher one. But delete the
stray tag before pushing:

```bash
git tag -d v0.1.1
```

Left in place and later turned into a release, it would publish the *older*
version after the newer one, and npm's `latest` would point backwards.

**Publishing the same version twice.** npm refuses — *"cannot publish over
previously published version"*. This is a safety net, not a problem: it is why
an accidental workflow run cannot do any damage. The version number is the real
trigger, and only you change it.

**A failed run is almost always an auth rejection**, not a build error. It shows
up at the publish step. The usual causes are a mismatch between the trusted
publisher settings on npm and reality: the workflow filename must be exactly
`publish.yml` (a filename, not a path), and if an **Environment name** is set on
npm then the workflow must declare a matching `environment:`. Ours sets neither.

---

## One-time setup (already done — recorded for reference)

On npmjs.com, under the package's **Settings → Trusted Publisher**:

| field | value |
|---|---|
| Repository | `abbasalshalchi/lerpa` |
| Workflow filename | `publish.yml` |
| Environment name | *(blank)* |
| Allowed actions | `Allow npm publish` only |

**The first version of any new package has to be published by hand**, with
`npm login` and `npm publish`. That settings page only exists once the package
does, and `npm trust` says the same — *"the package you're configuring must
already exist on the npm registry"*. npm has no equivalent of PyPI's pending
publishers. That is why `0.1.0` carries no provenance and everything from
`0.1.2` onwards does.

Do **not** create an access token with *Bypass two-factor authentication* for
CI. npm warns against it on the token page itself, and trusted publishing exists
so that nobody needs one.
