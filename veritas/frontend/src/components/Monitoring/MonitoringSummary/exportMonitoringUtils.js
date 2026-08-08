import JSZip from "jszip";
import { saveAs } from "file-saver";
function getSectionIdFromTitle(title) {
  const sectionMap = {
    'Internet': 'internet-section',
    'Servers': 'serveurs-section',
    'Storage': 'stockage-section',
    'Firewalls': 'firewalls-section',
    'Switches': 'switch-section',
    'WiFi Access Points': 'wifi-section',
    'Backup': 'sauvegarde-section',
    'Antivirus': 'antivirus-section',
    'Antispam': 'antispam-section',
    'Domain Names': 'ndd-section',
    'Office 365': 'office365-section'
  };
  return sectionMap[title] || null;
}
async function convertImageToBase64(img) {
  return new Promise(resolve => {
    if (!img.src || img.src.startsWith('data:')) {
      resolve(null);
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      try {
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        ctx.drawImage(tempImg, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        console.warn('Error converting image to base64:', error);
        resolve(null);
      }
    };
    tempImg.onerror = () => {
      resolve(null);
    };
    tempImg.src = img.src;
  });
}
async function convertSVGToImage(svgElement) {
  return new Promise(resolve => {
    try {
      const svg = svgElement.cloneNode(true);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const style = document.createElement('style');
      style.textContent = `
        * { color: #374151 !important; }
        .recharts-cartesian-axis-tick-value { fill: #374151 !important; }
        .recharts-legend-item-text { fill: #374151 !important; }
        .recharts-tooltip-label { color: #374151 !important; }
      `;
      svg.insertBefore(style, svg.firstChild);
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: 'image/svg+xml;charset=utf-8'
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || svgElement.clientWidth || 800;
        canvas.height = img.height || svgElement.clientHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataURL);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch (error) {
      console.warn('Error converting SVG:', error);
      resolve(null);
    }
  });
}
async function generateReportHTML(ref, config, reportType) {
  const content = ref.current;
  if (!content) return "";
  await new Promise(resolve => setTimeout(resolve, 300));
  const reportLabels = {
    'infrastructure': 'INFRASTRUCTURE',
    'cybersecurite': 'CYBERSECURITY',
    'services': 'SERVICES'
  };
  const reportColors = {
    'infrastructure': '#3b82f6',
    'cybersecurite': '#ef4444',
    'services': '#8b5cf6'
  };
  const reportColorLight = reportType === 'infrastructure' ? '#60a5fa' : reportType === 'cybersecurite' ? '#f87171' : '#a78bfa';
  const clone = content.cloneNode(true);
  clone.classList.remove('dark');
  clone.querySelectorAll('[class*="dark"]').forEach(el => {
    const classes = Array.from(el.classList);
    const darkClasses = classes.filter(c => c.includes('dark'));
    darkClasses.forEach(dc => el.classList.remove(dc));
  });
  const elementsToRemove = clone.querySelectorAll(".export-exclude, .toolbar, [class*='toolbar']");
  elementsToRemove.forEach(el => el.remove());
  clone.querySelectorAll('[data-variant]').forEach(btn => btn.remove());
  const reportLabelForTitle = reportLabels[reportType] || 'MONITORING';
  const reportColorForTitle = reportColors[reportType] || '#000000';
  const existingTitle = clone.querySelector('[class*="reportHeroTitle"]');
  if (existingTitle) {
    existingTitle.innerHTML = reportLabelForTitle;
    existingTitle.style.cssText = `
      font-size: clamp(3.5rem, 5.5vw, 5.5rem) !important;
      font-weight: 800 !important;
      letter-spacing: -0.03em !important;
      line-height: 1.1 !important;
      margin: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif !important;
      color: ${reportColorForTitle} !important;
    `;
  }
  const moduleSections = clone.querySelectorAll('[class*="scrollSection"]');
  moduleSections.forEach((section, index) => {
    const moduleTitle = section.querySelector('[class*="moduleTitle"], [class*="sectionTitle"], h2, h3');
    if (moduleTitle) {
      const titleText = moduleTitle.textContent.trim();
      const sectionId = `module-${titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      section.id = sectionId;
      section.setAttribute('data-module-section', sectionId);
    } else {
      section.id = `module-section-${index}`;
    }
  });
  clone.querySelectorAll('[class*="moduleBtn"], [class*="moduleNav"], [class*="moduleButtonsRow"], [class*="moduleButtonsWrapper"], [class*="moduleNavCluster"]').forEach(button => {
    button.remove();
  });
  const infrastructureSection = clone.querySelector('[class*="internetPinned"]');
  const cybersecuriteSection = clone.querySelector('[class*="cybersecuritePinned"]');
  const servicesSection = clone.querySelector('[class*="servicesPinned"]');
  if (reportType === 'infrastructure') {
    if (cybersecuriteSection) cybersecuriteSection.remove();
    if (servicesSection) servicesSection.remove();
    if (infrastructureSection) {
      infrastructureSection.style.display = '';
      infrastructureSection.style.visibility = 'visible';
    }
  } else if (reportType === 'cybersecurite') {
    if (infrastructureSection) infrastructureSection.remove();
    if (servicesSection) servicesSection.remove();
    if (cybersecuriteSection) {
      cybersecuriteSection.style.display = '';
      cybersecuriteSection.style.visibility = 'visible';
    }
  } else if (reportType === 'services') {
    if (infrastructureSection) infrastructureSection.remove();
    if (cybersecuriteSection) cybersecuriteSection.remove();
    if (servicesSection) {
      servicesSection.style.display = '';
      servicesSection.style.visibility = 'visible';
    }
  }
  clone.querySelectorAll('[class*="materialCard"]').forEach(card => {
    const content = card.querySelector('[class*="materialContent"]');
    if (content) {
      content.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
    }
    const toggleIcons = card.querySelectorAll('[class*="toggleIcon"]');
    toggleIcons.forEach(icon => icon.remove());
    const headers = card.querySelectorAll('[class*="materialHeader"]');
    headers.forEach(header => {
      header.style.cursor = 'default';
      header.onclick = null;
    });
  });
  clone.querySelectorAll('[class*="clickableModule"]').forEach(moduleItem => {
    const moduleTitle = moduleItem.querySelector('[class*="moduleTitle"]');
    if (moduleTitle) {
      const title = moduleTitle.textContent;
      const sectionId = getSectionIdFromTitle(title);
      if (sectionId) {
        const link = document.createElement('a');
        link.href = `#${sectionId}`;
        link.className = moduleItem.className;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.style.display = 'block';
        link.style.cursor = 'pointer';
        link.innerHTML = moduleItem.innerHTML;
        moduleItem.parentNode.replaceChild(link, moduleItem);
      }
    }
  });
  const allImages = clone.querySelectorAll('img');
  for (const img of allImages) {
    if (img.src && !img.src.startsWith('data:') && (img.src.includes('/assets/') || img.src.includes('assets/') || img.src.includes('icons/'))) {
      try {
        const base64 = await convertImageToBase64(img);
        if (base64) {
          img.src = base64;
        }
      } catch (error) {
        console.warn('Error converting image:', img.src, error);
      }
    }
  }
  clone.querySelectorAll('[class*="moduleIcon"]').forEach(icon => {
    if (icon.src) {
      const currentSrc = icon.src;
      if (currentSrc.includes('/assets/')) {
        icon.src = currentSrc;
      } else if (currentSrc.includes('assets/')) {
        icon.src = '/' + currentSrc;
      }
      icon.style.display = 'block';
      icon.style.width = '32px';
      icon.style.height = '32px';
      icon.style.objectFit = 'contain';
    }
  });
  const internetTitleWrapper = clone.querySelector('[class*="internetTitleWrapper"]');
  if (internetTitleWrapper) {
    internetTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const firewallTitleWrapper = clone.querySelector('[class*="firewallTitleWrapper"]');
  if (firewallTitleWrapper) {
    firewallTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const serverTitleWrapper = clone.querySelector('[class*="serverTitleWrapper"]');
  if (serverTitleWrapper) {
    serverTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const chartCanvases = clone.querySelectorAll('canvas');
  for (const canvas of chartCanvases) {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      if (hasContent) {
        const dataURL = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '400px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.alt = 'Exported chart';
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(img, canvas);
        }
      } else {
        const fallback = document.createElement('div');
        fallback.textContent = '[Chart loading]';
        fallback.style.textAlign = 'center';
        fallback.style.padding = '20px';
        fallback.style.color = '#6b7280';
        fallback.style.fontStyle = 'italic';
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(fallback, canvas);
        }
      }
    } catch (error) {
      console.warn('Error converting chart:', error);
      const fallback = document.createElement('div');
      fallback.textContent = '[Chart not available in export]';
      fallback.style.textAlign = 'center';
      fallback.style.padding = '20px';
      fallback.style.color = '#6b7280';
      fallback.style.fontStyle = 'italic';
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(fallback, canvas);
      }
    }
  }
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of sheet.cssRules) {
        css += rule.cssText + "\n";
      }
    } catch {}
  }
  const clientName = config?.client?.name || 'CLIENT';
  const reportLabel = reportLabels[reportType] || 'MONITORING';
  const reportColor = reportColors[reportType] || '#000000';
  const documentTitle = `${clientName} - ${reportLabel} REPORT`;
  const html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${documentTitle}</title>
      <style>
        ${css}

        /* ===== FORCED LIGHT MODE EXPORT STYLES ===== */
        
        /* Forced light mode CSS variables */
        :root {
          --bg-primary: #ffffff !important;
          --bg-secondary: #f9fafb !important;
          --bg-tertiary: #f3f4f6 !important;
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #6b7280 !important;
          --border-primary: #e5e7eb !important;
          --border-secondary: #d1d5db !important;
          --shadow-color: rgba(0, 0, 0, 0.1) !important;
        }

        /* Reset global minimal */
        * {
          box-sizing: border-box !important;
        }

        body {
          background-color: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          line-height: 1.6 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* ===== DARK MODE STYLES REMOVAL ===== */
        
        /* Dark classes were removed from the cloned DOM, so dark styles will not apply */
        /* Summary light-mode styles will apply naturally via included CSS modules */

        /* ===== SPECIAL EXPORT STYLES ===== */
        
        /* Improve print readability */
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          
          * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        /* Force chart display */
        canvas, svg {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      ${clone.outerHTML}
      
      <script>
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
      </script>
    </body>
  </html>`;
  return html;
}
export async function exportMonitoringAsHTML(ref, config) {
  const content = ref.current;
  if (!content) return "";
  await new Promise(resolve => setTimeout(resolve, 300));
  const infrastructureSection = content.querySelector('[class*="internetPinned"]');
  if (infrastructureSection) {
    infrastructureSection.setAttribute('data-report-section', 'infrastructure');
  }
  const cybersecuriteSection = content.querySelector('[class*="cybersecuritePinned"]');
  if (cybersecuriteSection) {
    cybersecuriteSection.setAttribute('data-report-section', 'cybersecurite');
  }
  const servicesSection = content.querySelector('[class*="servicesPinned"]');
  if (servicesSection) {
    servicesSection.setAttribute('data-report-section', 'services');
  }
  const clone = content.cloneNode(true);
  clone.classList.remove('dark');
  clone.querySelectorAll('[class*="dark"]').forEach(el => {
    const classes = Array.from(el.classList);
    const darkClasses = classes.filter(c => c.includes('dark'));
    darkClasses.forEach(dc => el.classList.remove(dc));
  });
  const elementsToRemove = clone.querySelectorAll(".export-exclude, .toolbar, [class*='toolbar']");
  elementsToRemove.forEach(el => el.remove());
  clone.querySelectorAll('[class*="moduleBtn"], [class*="moduleNav"], [class*="moduleButtonsRow"], [class*="moduleButtonsWrapper"], [class*="moduleNavCluster"]').forEach(button => {
    button.remove();
  });
  clone.querySelectorAll('[class*="materialCard"]').forEach(card => {
    const content = card.querySelector('[class*="materialContent"]');
    if (content) {
      content.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
    }
    const toggleIcons = card.querySelectorAll('[class*="toggleIcon"]');
    toggleIcons.forEach(icon => icon.remove());
    const headers = card.querySelectorAll('[class*="materialHeader"]');
    headers.forEach(header => {
      header.style.cursor = 'default';
      header.onclick = null;
    });
  });
  clone.querySelectorAll('[class*="clickableModule"]').forEach(moduleItem => {
    const moduleTitle = moduleItem.querySelector('[class*="moduleTitle"]');
    if (moduleTitle) {
      const title = moduleTitle.textContent;
      const sectionId = getSectionIdFromTitle(title);
      if (sectionId) {
        const link = document.createElement('a');
        link.href = `#${sectionId}`;
        link.className = moduleItem.className;
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.style.display = 'block';
        link.style.cursor = 'pointer';
        link.innerHTML = moduleItem.innerHTML;
        moduleItem.parentNode.replaceChild(link, moduleItem);
      }
    }
  });
  const allImages = clone.querySelectorAll('img');
  for (const img of allImages) {
    if (img.src && !img.src.startsWith('data:') && (img.src.includes('/assets/') || img.src.includes('assets/') || img.src.includes('icons/'))) {
      try {
        const base64 = await convertImageToBase64(img);
        if (base64) {
          img.src = base64;
        }
      } catch (error) {
        console.warn('Error converting image:', img.src, error);
      }
    }
  }
  clone.querySelectorAll('[class*="moduleIcon"]').forEach(icon => {
    if (icon.src) {
      const currentSrc = icon.src;
      if (currentSrc.includes('/assets/')) {
        icon.src = currentSrc;
      } else if (currentSrc.includes('assets/')) {
        icon.src = '/' + currentSrc;
      }
      icon.style.display = 'block';
      icon.style.width = '32px';
      icon.style.height = '32px';
      icon.style.objectFit = 'contain';
    }
  });
  const internetTitleWrapper = clone.querySelector('[class*="internetTitleWrapper"]');
  if (internetTitleWrapper) {
    internetTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const firewallTitleWrapper = clone.querySelector('[class*="firewallTitleWrapper"]');
  if (firewallTitleWrapper) {
    firewallTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const serverTitleWrapper = clone.querySelector('[class*="serverTitleWrapper"]');
  if (serverTitleWrapper) {
    serverTitleWrapper.style.marginTop = 'calc(10rem - 5rem)';
  }
  const chartCanvases = clone.querySelectorAll('canvas');
  for (const canvas of chartCanvases) {
    try {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      if (hasContent) {
        const dataURL = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '400px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.alt = 'Exported chart';
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(img, canvas);
        }
      } else {
        const fallback = document.createElement('div');
        fallback.textContent = '[Chart loading]';
        fallback.style.textAlign = 'center';
        fallback.style.padding = '20px';
        fallback.style.color = '#6b7280';
        fallback.style.fontStyle = 'italic';
        if (canvas.parentNode) {
          canvas.parentNode.replaceChild(fallback, canvas);
        }
      }
    } catch (error) {
      console.warn('Error converting chart:', error);
      const fallback = document.createElement('div');
      fallback.textContent = '[Chart not available in export]';
      fallback.style.textAlign = 'center';
      fallback.style.padding = '20px';
      fallback.style.color = '#6b7280';
      fallback.style.fontStyle = 'italic';
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(fallback, canvas);
      }
    }
  }
  let css = "";
  for (const sheet of document.styleSheets) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of sheet.cssRules) {
        css += rule.cssText + "\n";
      }
    } catch {}
  }
  const documentTitle = `${config?.client?.name || 'CLIENT'} - Monitoring ${config?.client?.reportPeriod || 'XXXX'}`;
  const html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${documentTitle}</title>
      <style>
        ${css}

        /* ===== FORCED LIGHT MODE EXPORT STYLES ===== */
        
        /* Forced light mode CSS variables */
        :root {
          --bg-primary: #ffffff !important;
          --bg-secondary: #f9fafb !important;
          --bg-tertiary: #f3f4f6 !important;
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #6b7280 !important;
          --border-primary: #e5e7eb !important;
          --border-secondary: #d1d5db !important;
          --shadow-color: rgba(0, 0, 0, 0.1) !important;
        }

        /* Reset global minimal */
        * {
          box-sizing: border-box !important;
        }

        body {
          background-color: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          line-height: 1.6 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }

        /* ===== DARK MODE STYLES REMOVAL ===== */
        
        /* Dark classes were removed from the cloned DOM, so dark styles will not apply */
        /* Summary light-mode styles will apply naturally via included CSS modules */

        /* ===== SPECIAL EXPORT STYLES ===== */
        
        /* Improve print readability */
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          
          * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        /* Force chart display */
        canvas, svg {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      ${clone.outerHTML}
    </body>
  </html>`;
  return html;
}
export async function generateZIPBlob(ref, config, reportAvailability = {}) {
  try {
    if (!ref || !ref.current) {
      throw new Error('Summary reference not available');
    }
    if (!config) {
      throw new Error('Configuration not available');
    }
    const zip = new JSZip();
    const reports = [{
      type: 'infrastructure',
      label: 'INFRASTRUCTURE',
      hasContent: reportAvailability.hasInfraContent !== false
    }, {
      type: 'cybersecurite',
      label: 'CYBERSECURITY',
      hasContent: reportAvailability.hasCyberContent !== false
    }, {
      type: 'services',
      label: 'SERVICES',
      hasContent: reportAvailability.hasServicesContent !== false
    }];
    for (const report of reports) {
      if (!report.hasContent) {
        continue;
      }
      try {
        const html = await generateReportHTML(ref, config, report.type);
        if (!html || html.trim() === '') {
          continue;
        }
        const clientName = (config?.client?.name || 'CLIENT').toUpperCase().replace(/\s+/g, '');
        const fileName = `${clientName} - ${report.label} REPORT.html`;
        zip.file(fileName, html);
      } catch (error) {}
    }
    if (Object.keys(zip.files).length === 0) {
      throw new Error('No report could be generated');
    }
    const zipBlob = await zip.generateAsync({
      type: "blob"
    });
    return zipBlob;
  } catch (error) {
    console.error('❌ Error generating ZIP:', error);
    throw error;
  }
}
export async function exportMonitoringAsZIP(ref, config, reportAvailability = {}) {
  try {
    const zipBlob = await generateZIPBlob(ref, config, reportAvailability);
    const formatDate = dateStr => {
      try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      } catch {
        return dateStr;
      }
    };
    let zipFileName = 'MONITORING REPORTS';
    if (config?.client?.checkmkPeriod?.start_time && config?.client?.checkmkPeriod?.end_time) {
      zipFileName = `FROM ${formatDate(config.client.checkmkPeriod.start_time)} TO ${formatDate(config.client.checkmkPeriod.end_time)}`;
    } else {
      const reportPeriod = config?.client?.reportPeriod || '';
      if (reportPeriod) {
        const dateMatch = reportPeriod.match(/(?:DU|FROM)\s+(\d{2}-\d{2}-\d{2,4})\s+(?:AU|TO)\s+(\d{2}-\d{2}-\d{2,4})/i);
        if (dateMatch) {
          zipFileName = `FROM ${dateMatch[1]} TO ${dateMatch[2]}`;
        } else {
          const datePattern = /(\d{2}-\d{2}-\d{2,4})/g;
          const dates = reportPeriod.match(datePattern);
          if (dates && dates.length >= 2) {
            zipFileName = `FROM ${dates[0]} TO ${dates[1]}`;
          } else {
            zipFileName = reportPeriod.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
            if (!zipFileName) {
              zipFileName = 'MONITORING REPORTS';
            }
          }
        }
      }
    }
    console.log('💾 Downloading ZIP:', `${zipFileName}.zip`);
    saveAs(zipBlob, `${zipFileName}.zip`);
    console.log('✅ Download started');
  } catch (error) {
    console.error('❌ Error exporting ZIP:', error);
    throw error;
  }
}
