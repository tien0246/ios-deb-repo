# RootHide LLDB 20 APT repository

This repository hosts the current LLDB 20 / Pwndbg packages built for
`iphoneos-arm64e` and RootHide. The packages were tested on an iPhone 10,2
running iOS 16; other device and bootstrap combinations are not verified.

## Add the source

Import this URL in Sileo or Zebra:

```text
https://tien0246.github.io/roothide-lldb20/
```

Launch Pwndbg with `/usr/bin/pwndbg-lldb`. `/usr/bin/lldb` starts plain LLDB.

## Packages

The `pool/` directory contains the installable packages for the tested setup:

- Pwndbg 2025.05.30, RootHide package revision 1.9
- LLDB and debugserver 20.1.8
- Python 3.12.14 and its LLDB runtime library

RootHide `roothide`, `libiosexec1`, `libedit0`, and the Python runtime
dependencies are bootstrap prerequisites and are not mirrored here. Let the
package manager resolve them from the jailbreak's configured sources.

## Updating the repository

Add new `.deb` files under `pool/` and push them to `main`. GitHub Actions
regenerates the flat APT indexes and deploys the site to GitHub Pages. Multiple
versions of a package can remain in `pool/`; the index includes all of them and
APT selects the newest compatible version.

From a clone, the update flow is:

```sh
cp /path/to/new-package.deb pool/
git add pool/new-package.deb
git commit -m "Add new package"
git push
```

The repository is public and its `Release` metadata is unsigned. Index and
package hashes are published over HTTPS; only add this source if you trust its
owner. These are local RootHide builds, not official upstream releases.

Upstream projects: [Pwndbg](https://github.com/pwndbg/pwndbg),
[LLVM/LLDB](https://github.com/llvm/llvm-project),
[CPython](https://github.com/python/cpython), and
[Procursus RootHide packaging](https://github.com/roothide/Procursus-roothide).
Pwndbg is MIT-licensed; bundled Python modules retain their license files in
the package where provided. Consult the upstream projects for their full
license and notice terms.
