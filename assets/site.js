(() => {
  const sourceAddress = document.getElementById("source-address");
  const routeLine = document.querySelector(".route-line");
  const brand = document.querySelector(".brand");
  const copyButton = document.getElementById("copy-source");
  const copyStatus = document.getElementById("copy-status");
  const searchInput = document.getElementById("package-search");
  const sectionFilter = document.getElementById("section-filter");
  const packageList = document.getElementById("package-list");
  const packageCount = document.getElementById("package-count");
  const packageStatus = document.getElementById("package-status");

  let packages = [];
  let copyTimer;
  let bellTimer;

  function setRouteDistance() {
    if (!routeLine) return;
    const packetWidth = 9;
    routeLine.style.setProperty("--route-distance", `${Math.max(0, routeLine.clientWidth - packetWidth)}px`);
  }

  function parseControlFile(source) {
    return source.trim().split(/\n\s*\n/).map((stanza) => {
      const fields = {};
      let current = "";

      for (const line of stanza.split(/\r?\n/)) {
        if (/^[\t ]/.test(line)) {
          if (current) {
            const continuation = line.trim();
            fields[current] += continuation === "." ? " " : ` ${continuation}`;
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
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function safePackageHref(filename) {
    if (!filename || !filename.startsWith("pool/")) return "";
    if (filename.split("/").includes("..")) return "";
    return new URL(filename, window.location.href).href;
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
      row.style.setProperty("--row-delay", `${index * 42}ms`);
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
    const metaValues = [packageData.Architecture, packageData.Section, readableSize(packageData.Size)].filter(Boolean);
    metadata.textContent = metaValues.join(" · ");
    main.append(metadata);

    if (packageData.Depends) {
      const details = document.createElement("details");
      details.className = "package-details";
      const summary = document.createElement("summary");
      summary.textContent = "Dependencies";
      const dependencies = document.createElement("code");
      dependencies.textContent = packageData.Depends;
      details.append(summary, dependencies);
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
      download.textContent = "Download .deb";
      download.setAttribute("aria-label", `Download ${packageData.Package} ${packageData.Version}`);
      actions.append(download);
    }
    row.append(actions);
    return row;
  }

  function renderPackages() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const section = sectionFilter.value;
    const filtered = packages.filter((pkg) => {
      const searchText = [pkg.Package, pkg.Version, pkg.Description, pkg.Architecture, pkg.Depends]
        .join(" ").toLowerCase();
      return (!query || searchText.includes(query)) && (!section || pkg.Section === section);
    });

    const fragment = document.createDocumentFragment();
    filtered.forEach((pkg, index) => fragment.append(makePackageRow(pkg, index)));
    packageList.replaceChildren(fragment);
    const totalLabel = `${packages.length} ${packages.length === 1 ? "package" : "packages"}`;
    packageCount.textContent = filtered.length === packages.length
      ? totalLabel
      : `${filtered.length} of ${totalLabel}`;

    if (filtered.length === 0) {
      packageStatus.textContent = packages.length ? "No packages match that filter." : "No packages are listed yet.";
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
        const success = document.execCommand("copy");
        input.remove();
        if (!success) throw new Error("Copy command failed");
      }
      copyButton.textContent = "Copied";
      copyButton.classList.add("is-copied");
      copyStatus.textContent = "Source URL copied to clipboard.";
      brand.classList.remove("is-copied");
      requestAnimationFrame(() => brand.classList.add("is-copied"));
      window.clearTimeout(bellTimer);
      bellTimer = window.setTimeout(() => brand.classList.remove("is-copied"), 520);
    } catch {
      copyStatus.textContent = "Copy failed — select the URL and copy it manually.";
    }
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyButton.textContent = "Copy URL";
      copyButton.classList.remove("is-copied");
    }, 1600);
  }

  async function loadIndex() {
    try {
      const response = await fetch("Packages", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Index request returned ${response.status}`);
      packages = parseControlFile(await response.text());
      setSections();
      packageList.classList.add("is-entering");
      renderPackages();
      requestAnimationFrame(() => document.documentElement.classList.add("index-ready"));
      window.setTimeout(() => packageList.classList.remove("is-entering"), 1000);
    } catch {
      packageCount.textContent = "Index unavailable";
      packageStatus.textContent = "Could not load Packages. Use the raw APT index link or try again later.";
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
  setRouteDistance();
  window.addEventListener("resize", setRouteDistance, { passive: true });
  loadIndex();
})();
