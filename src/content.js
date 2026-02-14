/**
 * Font Inspector v1.5
 * 特性：
 * 1. 新增：将字重数值转换为名称 (e.g. 700 -> Bold)
 * 2. 交互：显示名称，但 hover 时可看原始数值
 */

// =================CONFIG=================
const DEBUG_MODE = true;
const TOOLTIP_ID = 'fi-tooltip-container';
const OFFSET_Y = 12;

// =================STATE=================
let isExtensionEnabled = true;

// =================LOGGER=================
const logger = {
  log: (msg, data = null) => {
    if (DEBUG_MODE) console.log(`%c[FontInspector] ${msg}`, 'color: #3b82f6; font-weight: bold;', data || '');
  },
  error: (msg, err) => {
    if (DEBUG_MODE) console.error(`%c[FontInspector Error] ${msg}`, 'color: #ef4444; font-weight: bold;', err);
  }
};

// =================INIT STATE=================
chrome.storage.local.get(['fi_enabled'], (result) => {
  isExtensionEnabled = result.fi_enabled !== false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.fi_enabled) {
    isExtensionEnabled = changes.fi_enabled.newValue;
    if (!isExtensionEnabled) hideTooltip();
  }
});

// =================UTILS=================

// [核心] 字重数值转名称映射表
function getWeightLabel(weight) {
  // 确保转为字符串处理
  const w = String(weight).toLowerCase();
  
  const map = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    'normal': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    'bold': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
    '950': 'ExtraBlack'
  };

  // 如果在映射表中，返回名称；否则返回原始数值 (针对 Variable Fonts 如 550)
  return map[w] || w;
}

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return rgb;
  const r = parseInt(result[0]).toString(16).padStart(2, '0');
  const g = parseInt(result[1]).toString(16).padStart(2, '0');
  const b = parseInt(result[2]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function cleanFontName(fontFamily) {
  const fonts = fontFamily.split(',');
  return fonts[0].trim().replace(/^['"]|['"]$/g, '');
}

async function copyToClipboard(text, element) {
  try {
    await navigator.clipboard.writeText(text);
    logger.log('Copied:', text);
    
    // UI 反馈
    const tip = document.createElement('div');
    tip.className = 'fi-copied-tip';
    tip.textContent = 'Copied!';
    
    element.style.position = 'relative';
    element.appendChild(tip);
    
    setTimeout(() => tip.remove(), 1000);
  } catch (err) {
    logger.error('Copy failed', err);
  }
}

// =================CORE=================
let tooltipEl = null;

function initTooltip() {
  if (document.getElementById(TOOLTIP_ID)) return;
  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;
  document.body.appendChild(tooltipEl);
  
  tooltipEl.addEventListener('mouseup', (e) => e.stopPropagation());
  tooltipEl.addEventListener('mousedown', (e) => e.stopPropagation());
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('fi-visible');
}

function showTooltip(rect, styles) {
  if (!tooltipEl) initTooltip();

  // 获取字重的人类可读标签
  const weightLabel = getWeightLabel(styles.fontWeight);

  tooltipEl.innerHTML = `
    <div class="fi-item" data-copy="${styles.fontFamily}" title="Copy Font Name">
      <span class="font-medium">${styles.fontFamily}</span>
    </div>
    
    <div class="fi-divider"></div>

    <div class="fi-item" data-copy="${weightLabel}" title="Original Weight: ${styles.fontWeight}">
      <span style="color: #9ca3af; font-size: 11px; margin-right: 2px;">Wt:</span>
      <span>${weightLabel}</span>
    </div>

    <div class="fi-divider"></div>
    
    <div class="fi-item" data-copy="${styles.fontSize}" title="Copy Font Size">
      <span>${styles.fontSize}</span>
    </div>

    <div class="fi-divider"></div>

    <div class="fi-item" data-copy="${styles.colorHex}" title="Copy Color Hex">
      <span class="fi-color-circle" style="background-color: ${styles.colorHex};"></span>
      <span class="uppercase">${styles.colorHex}</span>
    </div>
  `;

  // 绑定点击事件
  const items = tooltipEl.querySelectorAll('.fi-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation(); 
      copyToClipboard(item.dataset.copy, item);
    });
  });

  // 计算位置
  const tooltipWidth = 330; 
  const tooltipHeight = 40;
  
  let top = rect.top + window.scrollY - tooltipHeight - OFFSET_Y;
  let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);

  if (rect.top - tooltipHeight - OFFSET_Y < 0) {
    top = rect.bottom + window.scrollY + OFFSET_Y;
  }
  
  if (left < 10) left = 10;
  const maxLeft = document.documentElement.clientWidth - tooltipWidth - 10;
  if (left > maxLeft) left = maxLeft;

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.classList.add('fi-visible');
}

function handleSelection(event) {
  if (!isExtensionEnabled) return;

  if (event.target.closest(`#${TOOLTIP_ID}`)) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    
    if (!selection.rangeCount || selection.isCollapsed) {
      hideTooltip();
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      hideTooltip();
      return;
    }

    let node = selection.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    
    if (node.closest(`#${TOOLTIP_ID}`)) return;

    const computed = window.getComputedStyle(node);
    
    const styles = {
      fontFamily: cleanFontName(computed.fontFamily),
      fontWeight: computed.fontWeight, // 原始值传给 showTooltip 处理
      fontSize: computed.fontSize,
      colorHex: rgbToHex(computed.color)
    };
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    showTooltip(rect, styles);
  }, 10);
}

// =================LISTENERS=================

document.addEventListener('mouseup', handleSelection);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip();
});

document.addEventListener('mousedown', (e) => {
  hideTooltip();
});