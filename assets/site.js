(() => {
  const sourceAddress = document.getElementById("source-address");
  const hero = document.querySelector(".hero");
  const brand = document.querySelector(".brand");
  const copyButton = document.getElementById("copy-source");
  const copyLabel = copyButton.querySelector("span");
  const copyStatus = document.getElementById("copy-status");
  const searchInput = document.getElementById("package-search");
  const sectionFilter = document.getElementById("section-filter");
  const packageList = document.getElementById("package-list");
  const packageCount = document.getElementById("package-count");
  const packageStatus = document.getElementById("package-status");

  let packages = [];
  let copyTimer;
  let animationTimer;

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

  function readableSize(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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

  function makePackageRow(packageData, index) {
    const row = document.createElement("li");
    row.className = "package-row";
    if (index < 8) {
      row.classList.add("package-row--enter");
      row.style.setProperty("--row-delay", (index * 42) + "ms");
    }

    addText(row, "span", "package-number", String(index + 1).padStart(2, "0"));

    const main = document.createElement("div");
    main.className = "package-main";
    const title = document.createElement("div");
    title.className = "package-title";
    addText(title, "span", "package-name", packageData.Package);
    addText(title, "code", "package-version", packageData.Version);
    main.append(title);

    const description = (packageData.Description || packageData.Section || "Debian package")
      .replace(/\s+/g, " ").trim();
    addText(main, "p", "package-description", description);

    const metadata = document.createElement("p");
    metadata.className = "package-meta";
    const values = [packageData.Architecture, packageData.Section, readableSize(packageData.Size)].filter(Boolean);
    metadata.textContent = values.join(" · ");
    main.append(metadata);

    const dependencyText = [
      packageData["Pre-Depends"] && "Pre-depends: " + packageData["Pre-Depends"],
      packageData.Depends && "Depends: " + packageData.Depends,
    ].filter(Boolean).join(" · ");
    if (dependencyText) {
      const details = document.createElement("details");
      details.className = "package-details";
      addText(details, "summary", "", "Dependencies");
      addText(details, "code", "", dependencyText);
      main.append(details);
    }

    row.append(main);

    const actions = document.createElement("div");
    actions.className = "package-row__actions";
    const href = safePackageHref(packageData.Filename);
    if (href) {
      const download = document.createElement("a");
      download.className = "download-link";
      download.href = href;
      download.textContent = "Get .deb";
      download.setAttribute("aria-label", "Download " + packageData.Package + " " + packageData.Version);
      actions.append(download);
    }
    row.append(actions);
    return row;
  }

  function renderPackages() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const section = sectionFilter.value;
    const filtered = packages.filter((pkg) => {
      const searchable = [pkg.Package, pkg.Version, pkg.Description, pkg.Architecture, pkg.Section, pkg.Depends]
        .join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (!section || pkg.Section === section);
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach((pkg, index) => fragment.append(makePackageRow(pkg, index)));
    packageList.replaceChildren(fragment);

    const totalLabel = packages.length + " " + (packages.length === 1 ? "package" : "packages");
    packageCount.textContent = filtered.length === packages.length
      ? totalLabel
      : filtered.length + " of " + totalLabel;

    if (filtered.length === 0) {
      packageStatus.textContent = packages.length ? "Nothing in this pocket matches." : "No packages are listed yet.";
      packageStatus.hidden = false;
    } else {
      packageStatus.textContent = "";
      packageStatus.hidden = true;
    }
  }

  function setSections() {
    const sections = [...new Set(packages.map((pkg) => pkg.Section).filter(Boolean))].sort();
    for (const section of sections) {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = section;
      sectionFilter.append(option);
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
      copyLabel.textContent = "Copied!";
      copyButton.classList.add("is-copied");
      copyStatus.textContent = "Ready to paste into Sileo or Zebra.";
      brand.classList.remove("is-copied");
      hero.classList.remove("is-copying");
      requestAnimationFrame(() => {
        brand.classList.add("is-copied");
        hero.classList.add("is-copying");
      });
      window.clearTimeout(animationTimer);
      animationTimer = window.setTimeout(() => {
        brand.classList.remove("is-copied");
        hero.classList.remove("is-copying");
      }, 700);
    } catch {
      copyStatus.textContent = "Copy failed — select the URL above and copy it manually.";
    }

    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyLabel.textContent = "Copy URL";
      copyButton.classList.remove("is-copied");
    }, 1700);
  }

  async function loadIndex() {
    try {
      const response = await fetch("Packages", { cache: "no-cache" });
      if (!response.ok) throw new Error("Index request failed");
      packages = parseControlFile(await response.text());
      setSections();
      packageList.classList.add("is-entering");
      renderPackages();
      requestAnimationFrame(() => document.documentElement.classList.add("index-ready"));
      window.setTimeout(() => packageList.classList.remove("is-entering"), 1100);
    } catch {
      packageCount.textContent = "Index offline";
      packageStatus.textContent = "Couldn't open the package index. Try the raw index link.";
      packageStatus.hidden = false;
      document.documentElement.classList.add("index-ready");
    }
  }

  copyButton.addEventListener("click", copySource);
  searchInput.addEventListener("input", () => {
    packageList.classList.remove("is-entering");
    renderPackages();
  });
  sectionFilter.addEventListener("change", () => {
    packageList.classList.remove("is-entering");
    renderPackages();
  });
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
