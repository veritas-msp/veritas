import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { jsPDF } from "jspdf";

const ANALYSIS_WIDTH = 1600;
const ANALYSIS_HEIGHT = 1000;
const VISUAL_WIDTH = 1320;
const VISUAL_VIEWPORT_HEIGHT = 860;

export function impactFileSlug(clientName) {
  return String(clientName || "client")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "client";
}

function nodeSize(node) {
  const width = Number(node.measured?.width || node.width || node.style?.width || 180);
  const height = Number(node.measured?.height || node.height || node.style?.height || 56);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 180,
    height: Number.isFinite(height) && height > 0 ? height : 56
  };
}

function boundsForExport(nodes) {
  const bounds = getNodesBounds(nodes);
  const originX = Number.isFinite(bounds.x) ? bounds.x : 0;
  const originY = Number.isFinite(bounds.y) ? bounds.y : 0;
  let maxX = originX;
  let maxY = originY;
  nodes.forEach(node => {
    const size = nodeSize(node);
    const x = Number(node.position?.x) || 0;
    const y = Number(node.position?.y) || 0;
    maxX = Math.max(maxX, x + size.width);
    maxY = Math.max(maxY, y + size.height);
  });
  return {
    x: originX,
    y: originY,
    width: Math.max(bounds.width || 0, maxX - originX, 200),
    height: Math.max(bounds.height || 0, maxY - originY, 80)
  };
}

function mountHost(width, background) {
  const host = document.createElement("div");
  host.setAttribute("data-impact-export-host", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${width}px`,
    `background:${background}`,
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
    "overflow:visible"
  ].join(";");
  document.body.appendChild(host);
  return host;
}

async function paintElement(element, { width, height, background }) {
  const { default: html2canvas } = await import("html2canvas");
  await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  const captureHeight = height || Math.max(element.scrollHeight, element.offsetHeight, 1);
  return html2canvas(element, {
    scale: 2,
    backgroundColor: background,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height: captureHeight,
    windowWidth: width,
    windowHeight: captureHeight,
    onclone: doc => {
      const host = doc.querySelector("[data-impact-export-host]");
      if (host) host.style.opacity = "1";
    }
  });
}

export async function captureAnalysisCanvas(wrapper, nodes) {
  const viewport = wrapper?.querySelector(".react-flow__viewport");
  const visible = (nodes || []).filter(node => !node.hidden);
  if (!viewport || !visible.length) throw new Error("empty");
  const fitted = getViewportForBounds(
    boundsForExport(visible),
    ANALYSIS_WIDTH,
    ANALYSIS_HEIGHT,
    0.05,
    1.35,
    0.14
  );
  const host = mountHost(ANALYSIS_WIDTH, "#f6f8fb");
  host.style.height = `${ANALYSIS_HEIGHT}px`;
  host.style.backgroundColor = "#f6f8fb";
  host.style.backgroundImage = "radial-gradient(circle, rgba(148, 163, 184, 0.45) 1px, transparent 1.2px)";
  host.style.backgroundSize = "18px 18px";
  const clone = viewport.cloneNode(true);
  clone.querySelectorAll(
    ".react-flow__resize-control, .react-flow__node-resizer, .react-flow__attribution, .react-flow__minimap"
  ).forEach(element => element.remove());
  clone.style.transform = `translate(${fitted.x}px, ${fitted.y}px) scale(${fitted.zoom})`;
  clone.style.transformOrigin = "0 0";
  clone.style.width = `${ANALYSIS_WIDTH}px`;
  clone.style.height = `${ANALYSIS_HEIGHT}px`;
  host.appendChild(clone);
  try {
    return await paintElement(host, {
      width: ANALYSIS_WIDTH,
      height: ANALYSIS_HEIGHT,
      background: "#f6f8fb"
    });
  } finally {
    host.remove();
  }
}

export async function captureVisualStage(stage) {
  const world = stage?.querySelector("[data-impact-export='world']");
  if (!stage || !world) throw new Error("empty");
  const host = mountHost(VISUAL_WIDTH, "#0c1424");
  const clone = stage.cloneNode(true);
  clone.querySelectorAll("[data-impact-no-export]").forEach(node => node.remove());
  clone.style.width = `${VISUAL_WIDTH}px`;
  clone.style.maxWidth = `${VISUAL_WIDTH}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.margin = "0";
  clone.style.flex = "none";
  clone.style.overflow = "visible";
  clone.style.position = "relative";
  const viewport = clone.querySelector("[data-impact-export='viewport']");
  const clonedWorld = clone.querySelector("[data-impact-export='world']");
  const legend = clone.querySelector("[data-impact-export='legend']");
  if (viewport) {
    viewport.style.position = "relative";
    viewport.style.flex = "none";
    viewport.style.height = `${VISUAL_VIEWPORT_HEIGHT}px`;
    viewport.style.minHeight = `${VISUAL_VIEWPORT_HEIGHT}px`;
    viewport.style.overflow = "visible";
    viewport.style.cursor = "default";
  }
  if (clonedWorld) {
    clonedWorld.style.transform = "none";
    clonedWorld.style.position = "relative";
    clonedWorld.style.left = "110px";
    clonedWorld.style.top = "48px";
  }
  if (legend) {
    legend.style.position = "relative";
    legend.style.left = "18px";
    legend.style.bottom = "auto";
    legend.style.margin = "8px 0 18px";
    legend.style.maxWidth = `${VISUAL_WIDTH - 36}px`;
  }
  clone.querySelectorAll("button").forEach(button => {
    const block = document.createElement("div");
    block.className = button.className;
    block.style.cssText = button.style.cssText;
    block.innerHTML = button.innerHTML;
    button.replaceWith(block);
  });
  host.appendChild(clone);
  try {
    const height = Math.max(host.scrollHeight, host.offsetHeight, VISUAL_VIEWPORT_HEIGHT);
    return await paintElement(host, { width: VISUAL_WIDTH, height, background: "#0c1424" });
  } finally {
    host.remove();
  }
}

function saveLink(href, fileName) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadCanvasPng(canvas, fileName) {
  saveLink(canvas.toDataURL("image/png"), fileName);
}

export function downloadCanvasPdf(canvas, { fileName, title, subtitle }) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(String(title || ""), pageW - margin * 2);
  pdf.text(titleLines, margin, 10);
  let cursor = 10 + titleLines.length * 5;
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    const subtitleLines = pdf.splitTextToSize(String(subtitle), pageW - margin * 2);
    pdf.text(subtitleLines, margin, cursor);
    cursor += subtitleLines.length * 4.2;
  }
  const top = cursor + 3;
  const maxW = pageW - margin * 2;
  const maxH = pageH - top - margin;
  const ratio = canvas.width / Math.max(canvas.height, 1);
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  const x = margin + (maxW - width) / 2;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, top, width, height, undefined, "FAST");
  const url = URL.createObjectURL(pdf.output("blob"));
  saveLink(url, fileName);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
