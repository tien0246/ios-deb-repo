# iOS APT package repository

This is a generic flat APT repository for jailbreak `.deb` packages. Its
initial contents are LLDB 20, Pwndbg, and their Python runtime packages, built
for RootHide on `iphoneos-arm64e`. Those packages were tested on an iPhone 10,2
running iOS 16; other device and bootstrap combinations are not verified.
Future tweaks and packages can be added without changing the repository setup.

## Add the source

Import this URL in Sileo or Zebra:

```text
https://tien0246.github.io/repo/
```

Launch Pwndbg with `/usr/bin/pwndbg-lldb`. `/usr/bin/lldb` starts plain LLDB.

## Packages

The `pool/` directory currently contains these packages for the tested setup:

- Pwndbg 2025.05.30, RootHide package revision 1.9
- LLDB and debugserver 20.1.8
- Python 3.12.14 and its LLDB runtime library

The current LLDB/Pwndbg packages require RootHide `roothide`, `libiosexec1`,
`libedit0`, and Python runtime libraries from the jailbreak bootstrap. They
are not mirrored here; let the package manager resolve dependencies from the
device's configured sources. Dependencies for future packages can be supplied
by this repo or by other configured APT sources.

## Updating the repository

Add new iOS `.deb` files anywhere under `pool/` and push them to `main`. GitHub
Actions scans the directory, advertises common iOS architectures plus any
additional architecture found in package metadata, regenerates the flat APT
indexes, and deploys the site to GitHub Pages. Architecture-independent
packages are included as well. Multiple versions can remain in `pool/`; the
index includes them and APT selects the newest compatible version.

From a clone, the update flow is:

```sh
cp /path/to/new-package.deb pool/
git add pool/new-package.deb
git commit -m "Add new package"
git push
```

The repository is public and its `Release` metadata is unsigned. Index and
package hashes are published over HTTPS; only add this source if you trust its
owner. The initial LLDB/Pwndbg packages are local RootHide builds, not official
upstream releases.

Upstream projects: [Pwndbg](https://github.com/pwndbg/pwndbg),
[LLVM/LLDB](https://github.com/llvm/llvm-project),
[CPython](https://github.com/python/cpython), and
[Procursus RootHide packaging](https://github.com/roothide/Procursus-roothide).
Pwndbg is MIT-licensed; bundled Python modules retain their license files in
the package where provided. Consult the upstream projects for their full
license and notice terms.
