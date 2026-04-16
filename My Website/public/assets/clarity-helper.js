(function () {
  if (typeof window === "undefined") return;

  const sentEvents = new Set();

  function slugToName(slug, stripGuideSuffix) {
    if (!slug) return "";
    let normalized = slug.replace(/\/+$/, "");
    if (stripGuideSuffix) normalized = normalized.replace(/-guide$/, "");
    return normalized
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getPageContext() {
    const path = window.location.pathname.replace(/index\.html$/i, "");
    const segments = path.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] || "home";

    if (segments.length === 0) {
      return { pageType: "home", pageSlug: "home", contentGroup: "marketing" };
    }

    if (segments[0] === "tools") {
      if (segments.length === 1) {
        return { pageType: "tools", pageSlug: "tools", contentGroup: "marketing" };
      }

      const toolSlug = segments[1];
      const isGenerator = toolSlug.includes("generator");
      return {
        pageType: "tool",
        pageSlug: toolSlug,
        contentGroup: isGenerator ? "generator" : "calculator",
        toolName: slugToName(toolSlug, false)
      };
    }

    if (segments[0] === "guides") {
      if (segments.length === 1) {
        return { pageType: "guides", pageSlug: "guides", contentGroup: "guide" };
      }

      const guideSlug = segments[1];
      return {
        pageType: "guide",
        pageSlug: guideSlug,
        contentGroup: "guide",
        guideName: `${slugToName(guideSlug, true)} Guide`.trim()
      };
    }

    if (segments[0] === "about") {
      return { pageType: "about", pageSlug: "about", contentGroup: "marketing" };
    }

    if (segments[0] === "contact") {
      return { pageType: "contact", pageSlug: "contact", contentGroup: "support" };
    }

    if (segments[0] === "pricing") {
      return { pageType: "pricing", pageSlug: "pricing", contentGroup: "marketing" };
    }

    if (segments[0] === "restaurant-calculators") {
      return { pageType: "tools", pageSlug: "restaurant-calculators", contentGroup: "marketing" };
    }

    return {
      pageType: "other",
      pageSlug: slug || "other",
      contentGroup: ["privacy-policy", "contact"].includes(slug) ? "support" : "general"
    };
  }

  function setTag(key, value) {
    if (!value || typeof window.clarity !== "function") return;
    window.clarity("set", key, String(value));
  }

  function sendEvent(name) {
    if (!name || sentEvents.has(name) || typeof window.clarity !== "function") return;
    sentEvents.add(name);
    window.clarity("event", name);
  }

  function describeAction(target) {
    if (!target) return "";
    const raw = [
      target.getAttribute && target.getAttribute("aria-label"),
      target.getAttribute && target.getAttribute("title"),
      target.id,
      target.className,
      target.textContent,
      target.value
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return raw.replace(/\s+/g, " ").trim();
  }

  function setupActionTracking(context) {
    document.addEventListener(
      "submit",
      function () {
        if (context.pageType === "tool") sendEvent("calculator_used");
      },
      true
    );

    document.addEventListener(
      "click",
      function (event) {
        const target = event.target.closest("a, button, input[type='button'], input[type='submit'], input[type='reset']");
        if (!target) return;

        const href = (target.getAttribute("href") || "").toLowerCase();
        const actionText = describeAction(target);

        if (href.includes("wa.me") || actionText.includes("whatsapp")) {
          sendEvent("whatsapp_clicked");
        }

        if (actionText.includes("example")) {
          sendEvent("example_loaded");
        }

        if (actionText.includes("reset") || target.type === "reset") {
          sendEvent("reset_clicked");
        }

        if (actionText.includes("print")) {
          sendEvent("print_clicked");
        }

        if (actionText.includes("copy")) {
          sendEvent("copy_result_clicked");
        }

        if (
          context.pageType === "tool" &&
          /(calculate|generate|create|convert|summarize|submit|estimate|compute)/.test(actionText)
        ) {
          sendEvent("calculator_used");
        }

        if (
          /(start free|get started|try|use tool|open live demo|contact us|book demo|calculate now|generate now)/.test(actionText)
        ) {
          sendEvent("cta_clicked");
        }
      },
      true
    );
  }

  function init() {
    const context = getPageContext();

    setTag("pageType", context.pageType);
    setTag("pageSlug", context.pageSlug);
    setTag("contentGroup", context.contentGroup);
    setTag("toolName", context.toolName);
    setTag("guideName", context.guideName);

    setupActionTracking(context);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
