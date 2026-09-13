(() => {
  const intro = document.querySelector(".repo-intro");
  const sourceAddress = document.getElementById("source-address");
  const copyButton = document.getElementById("copy-source");
  const copyLabel = copyButton.querySelector("span");
  const copyStatus = document.getElementById("copy-status");
  const searchInput = document.getElementById("package-search");
  const packageList = document.getElementById("package-list");
  const packageCount = document.getElementById("package-count");
  const packageStatus = document.getElementById("package-status");

  let packages = [];
  let copyTimer;
  let copyMotionTimer;

  function parseControlFile(source) {
    return source.trim().split(/\n\s*\n/).map((stanza) => {
      const fields = {};
      let current = "";

      for (const line of stanza.split(/\r?\n/)) {
        if (/^[\t ]/.test(line)) {
          if (current) {
            const continuation = line.trim();
            fields[current] += continuation === "." ? " " : " " + continuation;
          }
          continue;
        }

        const separator = line.indexOf(":");
        if (separator < 1) continue;
        current = line.slice(0, separator);
        fields[current] = line.slice(separator + 1).trim();
      }

      return fields;
    }).filter((fields) => fields.Package && fields.Version);
  }

  function safePackageHref(filename) {
    if (!filename || !filename.startsWith("pool/") || filename.split("/").includes("..")) return "";
    try {
      const url = new URL(filename, window.location.href);
      const poolRoot = new URL("pool/", window.location.href);
      return url.origin === poolRoot.origin && url.pathname.startsWith(poolRoot.pathname) ? url.href : "";
    } catch {
      return "";
    }
  }

  function addText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function makePackageRow(packageData) {
    const row = document.createElement("li");
    row.className = "package-row";

    const main = document.createElement("div");
    main.className = "package-main";
    const title = document.createElement("div");
    title.className = "package-title";
    addText(title, "h2", "package-name", packageData.Package);
    addText(title, "code", "package-version", packageData.Version);
    main.append(title);

    row.append(main);

    const href = safePackageHref(packageData.Filename);
    if (href) {
      const download = document.createElement("a");
      download.className = "download-link";
      download.href = href;
      download.textContent = "Download";
      download.setAttribute("aria-label", "Download " + packageData.Package + " " + packageData.Version);
      row.append(download);
    }
    return row;
  }

  function renderPackages() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const filtered = packages.filter((pkg) => {
      const searchable = [
        pkg.Package, pkg.Version, pkg.Description, pkg.Architecture,
        pkg.Section, pkg.Depends, pkg["Pre-Depends"],
      ].join(" ").toLowerCase();
      return !query || searchable.includes(query);
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach((pkg) => fragment.append(makePackageRow(pkg)));
    packageList.replaceChildren(fragment);

    const total = packages.length + (packages.length === 1 ? " package" : " packages");
    packageCount.textContent = filtered.length === packages.length
      ? total
      : filtered.length + " matches, " + total + " total";

    if (filtered.length === 0) {
      packageStatus.textContent = packages.length ? "No matches." : "No packages yet.";
      packageStatus.hidden = false;
    } else {
      packageStatus.textContent = "";
      packageStatus.hidden = true;
    }
  }

  async function copySource() {
    const value = sourceAddress.textContent.trim();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy command failed");
      }
      copyLabel.textContent = "Copied";
      copyButton.classList.add("is-copied");
      copyStatus.textContent = "Repository URL copied.";
      intro.classList.remove("is-copying");
      requestAnimationFrame(() => intro.classList.add("is-copying"));
      window.clearTimeout(copyMotionTimer);
      copyMotionTimer = window.setTimeout(() => intro.classList.remove("is-copying"), 500);
    } catch {
      copyStatus.textContent = "Copy failed. Select and copy the source URL.";
    }

    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyLabel.textContent = "Copy";
      copyButton.classList.remove("is-copied");
    }, 1600);
  }

  async function loadIndex() {
    try {
      const response = await fetch("Packages", { cache: "no-cache" });
      if (!response.ok) throw new Error("Index request failed");
      packages = parseControlFile(await response.text());
      renderPackages();
    } catch {
      packageCount.textContent = "Package index unavailable";
      packageStatus.textContent = "Package index unavailable. Open the raw index.";
      packageStatus.hidden = false;
    }
  }

  copyButton.addEventListener("click", copySource);
  searchInput.addEventListener("input", renderPackages);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement
      && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      searchInput.focus();
    } else if (event.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      renderPackages();
    }
  });

  loadIndex();
})();
