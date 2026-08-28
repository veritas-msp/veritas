export function extractHeadings(html) {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  return [...doc.querySelectorAll("h1, h2, h3, h4")].map((el, index) => ({
    id: el.getAttribute("id") || `kb-h-${index}`,
    level: Number(el.tagName.slice(1)) || 2,
    text: (el.textContent || "").replace(/\s+/g, " ").trim()
  })).filter(item => item.text);
}

export function withHeadingIds(html) {
  if (typeof DOMParser === "undefined") return String(html || "");
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  [...doc.querySelectorAll("h1, h2, h3, h4")].forEach((el, index) => {
    if (!el.getAttribute("id")) el.setAttribute("id", `kb-h-${index}`);
  });
  return doc.body.innerHTML;
}

export function highlightText(text, query) {
  const source = String(text || "");
  const q = String(query || "").trim();
  if (!q) return source;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(escaped, "ig"), match => `«${match}»`);
}

export function highlightHtml(html, query) {
  const source = String(html || "");
  const q = String(query || "").trim();
  if (!q) return source;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`(${escaped})(?![^<]*>)`, "ig"), "<mark>$1</mark>");
}

export function highlightPlain(text, query) {
  const escaped = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return highlightHtml(escaped, query);
}

export function articleTemplates(copy) {
  const t = copy.templates || {};
  const para = text => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] });
  const heading = (level, text) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
  return [
    {
      id: "procedure",
      title: t.procedureTitle || "Procédure",
      description: t.procedureHint,
      category: t.procedureCategory || "",
      json: {
        type: "doc",
        content: [
          heading(2, t.procedureGoal || "Objectif"),
          para(t.procedureGoalBody),
          heading(2, t.procedureSteps || "Étapes"),
          { type: "orderedList", content: [1, 2, 3].map(() => ({ type: "listItem", content: [para("")] })) },
          heading(2, t.procedureChecks || "Vérifications"),
          { type: "taskList", content: [1, 2].map(() => ({ type: "taskItem", attrs: { checked: false }, content: [para("")] })) }
        ]
      }
    },
    {
      id: "faq",
      title: t.faqTitle || "FAQ",
      description: t.faqHint,
      category: t.faqCategory || "",
      json: {
        type: "doc",
        content: [
          heading(2, t.faqQ1 || "Question"),
          para(t.faqA1),
          heading(2, t.faqQ2 || "Question"),
          para(t.faqA2)
        ]
      }
    },
    {
      id: "incident",
      title: t.incidentTitle || "Incident",
      description: t.incidentHint,
      category: t.incidentCategory || "",
      json: {
        type: "doc",
        content: [
          heading(2, t.incidentSymptoms || "Symptômes"),
          para(""),
          heading(2, t.incidentImpact || "Impact"),
          para(""),
          heading(2, t.incidentFix || "Résolution"),
          { type: "orderedList", content: [1, 2].map(() => ({ type: "listItem", content: [para("")] })) },
          heading(2, t.incidentPrevent || "Prévention"),
          para("")
        ]
      }
    },
    {
      id: "onboarding",
      title: t.onboardingTitle || "Onboarding",
      description: t.onboardingHint,
      category: t.onboardingCategory || "",
      json: {
        type: "doc",
        content: [
          heading(2, t.onboardingWelcome || "Bienvenue"),
          para(""),
          heading(2, t.onboardingAccess || "Accès à créer"),
          { type: "taskList", content: [1, 2, 3].map(() => ({ type: "taskItem", attrs: { checked: false }, content: [para("")] })) },
          heading(2, t.onboardingNext || "Prochaines étapes"),
          para("")
        ]
      }
    }
  ];
}

export function templateToHtml(json) {
  const walk = (node) => {
    if (!node) return "";
    if (node.type === "text") return escapeHtml(node.text || "");
    const inner = (node.content || []).map(walk).join("");
    if (node.type === "doc") return inner;
    if (node.type === "heading") return `<h${node.attrs?.level || 2}>${inner}</h${node.attrs?.level || 2}>`;
    if (node.type === "paragraph") return `<p>${inner || "<br>"}</p>`;
    if (node.type === "orderedList") return `<ol>${inner}</ol>`;
    if (node.type === "bulletList") return `<ul>${inner}</ul>`;
    if (node.type === "listItem") return `<li>${inner}</li>`;
    if (node.type === "taskList") return `<ul data-type="taskList">${inner}</ul>`;
    if (node.type === "taskItem") {
      const checked = node.attrs?.checked ? "true" : "false";
      return `<li data-type="taskItem" data-checked="${checked}"><label contenteditable="false"><input type="checkbox"${node.attrs?.checked ? " checked" : ""}><span></span></label><div>${inner || "<p></p>"}</div></li>`;
    }
    return inner;
  };
  return walk(json);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
