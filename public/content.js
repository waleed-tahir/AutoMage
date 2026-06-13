// content.js - Injected into active pages

let isRecording = false;
let widgetElement = null;
let lastEventTime = Date.now();

let heldKeys = {};

let isPlaybackCancelled = false;

function createPlaybackBanner(totalSteps) {
  removePlaybackBanner();
  
  const banner = document.createElement('div');
  banner.id = 'ai-mod-playback-banner';
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 14px; animation: mod-spin 2s linear infinite;">⏳</span>
      <span style="font-weight: bold; font-family: sans-serif; font-size: 12px; color: white;">Playing Macro</span>
      <span id="ai-mod-playback-step" style="opacity: 0.9; font-family: monospace; font-size: 12px; color: #60a5fa;">(0/${totalSteps})</span>
    </div>
    <button id="ai-mod-stop-playback" style="margin-top: 6px; background-color: #ef4444; border: none; color: white; padding: 4px 12px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600; transition: background-color 0.15s; outline: none; width: 100%;">Stop Playback</button>
  `;
  
  banner.style.position = 'fixed';
  banner.style.top = '16px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.zIndex = '2147483647';
  banner.style.backgroundColor = 'rgba(9, 9, 11, 0.95)'; 
  banner.style.color = 'white';
  banner.style.padding = '10px 18px';
  banner.style.borderRadius = '8px';
  banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)';
  banner.style.border = '1px solid rgba(63, 63, 70, 0.8)';
  banner.style.backdropFilter = 'blur(6px)';
  
  const style = document.createElement('style');
  style.id = 'ai-mod-playback-banner-style';
  style.textContent = `
    @keyframes mod-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    #ai-mod-stop-playback:hover {
      background-color: #dc2626;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(banner);
  
  banner.querySelector('#ai-mod-stop-playback').addEventListener('click', () => {
    isPlaybackCancelled = true;
    removePlaybackBanner();
  });
}

function updatePlaybackStep(currentStep, totalSteps) {
  const el = document.getElementById('ai-mod-playback-step');
  if (el) {
    el.textContent = `(${currentStep}/${totalSteps})`;
  }
}

function removePlaybackBanner() {
  const banner = document.getElementById('ai-mod-playback-banner');
  if (banner) banner.remove();
  const style = document.getElementById('ai-mod-playback-banner-style');
  if (style) style.remove();
}

// Helper to check if event was inside our floating widget
function isEventInsideWidget(e) {
  return e.composedPath().some(el => el.id === 'ai-mod-recording-widget');
}

// 1. URL Pattern Matcher (Tampermonkey Style)
function urlMatchesPattern(url, pattern) {
  if (!pattern || pattern.trim() === '' || pattern === '*' || pattern === '<all_urls>') return true;
  const cleanPattern = pattern.trim();
  
  if (cleanPattern.startsWith('/') && cleanPattern.endsWith('/')) {
    try {
      const regex = new RegExp(cleanPattern.slice(1, -1), 'i');
      return regex.test(url);
    } catch {
      // Ignore invalid regex patterns
    }
  }
  
  try {
    let regexPattern = cleanPattern;
    if (!cleanPattern.includes('://')) {
      if (!cleanPattern.includes('*')) {
        return url.toLowerCase().includes(cleanPattern.toLowerCase());
      }
      regexPattern = '.*' + cleanPattern;
    }
    const regexString = '^' + regexPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\\\.\*/g, '.*')
      + '$';
    return new RegExp(regexString, 'i').test(url);
  } catch {
    return url.toLowerCase().includes(cleanPattern.toLowerCase());
  }
}

// 2. Safe DOM Injectors for Scripts and Styles
// 2. Safe DOM Injectors for Scripts and Styles
const bridgeToken = 'token_' + Math.random().toString(36).substr(2, 16);
window._ai_mod_bridge_token = bridgeToken;

const initMainWorldListeners = (token) => {
  try {
    document.documentElement.setAttribute('data-ai-mod-token', token);
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected_bridge.js');
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (e) {
    console.error("Error initializing Main World listeners:", e);
  }
};

// Initialize listeners immediately
initMainWorldListeners(bridgeToken);



// 3. Page-load injection of active mods (scripts/CSS) and keybinding tracking
let activePageMods = [];
chrome.storage.local.get(['mods'], (result) => {
  const mods = result.mods || [];
  activePageMods = mods;
  const currentUrl = window.location.href;
  
  mods.forEach(mod => {
    if (mod.active) {
      if (mod.keybinding) return; // Triggered via keyboard shortcut instead of auto-run
      
      const pattern = mod.matchPattern || mod.domain || '*';
      if (urlMatchesPattern(currentUrl, pattern)) {
        console.log(`Automage: Injecting active mod "${mod.title}"`);
        if (mod.type === 'JS') {
          chrome.runtime.sendMessage({
            action: 'INJECT_PAGE_LOAD_MOD',
            payload: {
              mod: mod,
              token: bridgeToken
            }
          }).catch(err => {
            console.warn("Could not inject JS mod via background:", err);
          });
        } else if (mod.type === 'CSS') {
          chrome.runtime.sendMessage({
            action: 'INSERT_CSS',
            payload: {
              id: mod.id,
              code: mod.code
            }
          }).catch(err => {
            console.warn("Could not inject CSS mod via background:", err);
          });
        }
      }
    }
  });
});

// 4. On page load, check recording and healing states and initialize
let healingInfo = null;
let hoveredElement = null;
let originalBorder = '';

function startHealingMode() {
  if (document.getElementById('ai-mod-healing-banner')) return;
  
  const banner = document.createElement('div');
  banner.id = 'ai-mod-healing-banner';
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 14px;">🎯</span>
      <span style="font-weight: bold;">Healing Step #${healingInfo.stepIdx + 1}</span>
    </div>
    <div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">Hover & click the new element on page to replace selector.</div>
    <button id="ai-mod-cancel-healing" style="margin-top: 6px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 3px 10px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600; transition: background 0.15s;">Cancel Healing</button>
  `;
  
  banner.style.position = 'fixed';
  banner.style.top = '16px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.zIndex = '2147483647';
  banner.style.background = 'linear-gradient(135deg, #d97706, #b45309)'; 
  banner.style.color = 'white';
  banner.style.padding = '10px 16px';
  banner.style.borderRadius = '8px';
  banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
  banner.style.fontFamily = 'sans-serif';
  banner.style.fontSize = '12px';
  banner.style.textAlign = 'center';
  banner.style.border = '1px solid rgba(251, 191, 36, 0.4)';
  banner.style.backdropFilter = 'blur(6px)';
  
  document.body.appendChild(banner);
  
  banner.querySelector('#ai-mod-cancel-healing').addEventListener('click', () => {
    chrome.storage.local.remove(['healingInfo']);
  });
  
  document.addEventListener('mouseover', onHealingMouseOver, true);
  document.addEventListener('mouseout', onHealingMouseOut, true);
  document.addEventListener('click', onHealingClick, true);
}

function stopHealingMode() {
  const banner = document.getElementById('ai-mod-healing-banner');
  if (banner) banner.remove();
  
  if (hoveredElement) {
    hoveredElement.style.outline = originalBorder;
    hoveredElement = null;
  }
  
  document.removeEventListener('mouseover', onHealingMouseOver, true);
  document.removeEventListener('mouseout', onHealingMouseOut, true);
  document.removeEventListener('click', onHealingClick, true);
}

function onHealingMouseOver(e) {
  if (e.target.id === 'ai-mod-healing-banner' || e.target.closest('#ai-mod-healing-banner')) return;
  if (hoveredElement) {
    hoveredElement.style.outline = originalBorder;
  }
  hoveredElement = e.target;
  originalBorder = e.target.style.outline;
  e.target.style.outline = '2px dashed #fbbf24'; 
}

function onHealingMouseOut(e) {
  if (hoveredElement === e.target) {
    e.target.style.outline = originalBorder;
    hoveredElement = null;
  }
}

async function onHealingClick(e) {
  if (e.target.id === 'ai-mod-healing-banner' || e.target.closest('#ai-mod-healing-banner')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const newSelector = generateSelector(e.target);
  
  if (healingInfo) {
    const { modId, stepIdx } = healingInfo;
    
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['mods', 'macroEvents'], resolve);
    });
    
    let macroEvents = data.macroEvents || [];
    let mods = data.mods || [];
    
    if (macroEvents[stepIdx]) {
      macroEvents[stepIdx].target = newSelector;
    }
    
    if (modId) {
      mods = mods.map(m => {
        if (m.id === modId) {
          const updatedEvents = [...(m.events || [])];
          if (updatedEvents[stepIdx]) {
            updatedEvents[stepIdx].target = newSelector;
          }
          return { ...m, events: updatedEvents };
        }
        return m;
      });
    }
    
    await new Promise(resolve => {
      chrome.storage.local.set({ mods, macroEvents }, resolve);
    });
    
    e.target.style.outline = '2px solid #10b981'; 
    setTimeout(() => {
      e.target.style.outline = originalBorder;
    }, 600);
    
    chrome.storage.local.remove(['healingInfo']);
  }
}// Advanced Multi-Element Grabber Mode
let elementPickerActive = false;
let pickerHoveredElement = null;
let pickerOriginalBorder = '';

let stagedElements = [];
let lastGrabbedDOMNode = null;
let selectedNodesSet = new Set();
let originalOutlines = new Map();

function buildContextForElement(el, overrideSelector = null, selectAll = false) {
  return {
    selector: overrideSelector || generateSelector(el),
    selectAll: selectAll,
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
    attributes: Array.from(el.attributes).filter(a => !['class', 'style', 'id'].includes(a.name)).map(a => ({ name: a.name, value: a.value })),
    text: (el.innerText || el.value || '').trim().substring(0, 100),
    outerHTML: el.outerHTML ? el.outerHTML.substring(0, 500) + (el.outerHTML.length > 500 ? '...' : '') : ''
  };
}

function setSolidOutline(node) {
  if (!originalOutlines.has(node)) {
    originalOutlines.set(node, node.style.outline);
  }
  node.style.outline = '2px solid #10b981';
  selectedNodesSet.add(node);
}

function clearSolidOutline(node) {
  if (originalOutlines.has(node)) {
    node.style.outline = originalOutlines.get(node);
    originalOutlines.delete(node);
  } else {
    node.style.outline = '';
  }
  selectedNodesSet.delete(node);
}

function clearAllSelectedOutlines() {
  selectedNodesSet.forEach(node => clearSolidOutline(node));
}

function updateGrabberWidgetUI() {
  const widget = document.getElementById('ai-mod-grabber-widget');
  if (!widget || !widget.shadowRoot) return;
  const statusEl = widget.shadowRoot.getElementById('ai-mod-grabber-status');
  const controlsEl = widget.shadowRoot.getElementById('ai-mod-grabber-controls');
  if (statusEl) {
    statusEl.textContent = `Selected: ${stagedElements.length} element(s)`;
  }
  if (controlsEl) {
    controlsEl.style.display = lastGrabbedDOMNode ? 'flex' : 'none';
  }
}

function replaceLastSelection(newNode, newContext) {
  if (!newNode) return;
  if (lastGrabbedDOMNode) {
    clearSolidOutline(lastGrabbedDOMNode);
    stagedElements.pop(); // Remove the last one
  }
  lastGrabbedDOMNode = newNode;
  setSolidOutline(newNode);
  stagedElements.push(newContext);
  updateGrabberWidgetUI();
}

function startElementPickerMode() {
  if (document.getElementById('ai-mod-grabber-widget')) return;
  
  stagedElements = [];
  lastGrabbedDOMNode = null;
  selectedNodesSet.clear();
  originalOutlines.clear();
  
  const host = document.createElement('div');
  host.id = 'ai-mod-grabber-widget';
  host.style.position = 'fixed';
  host.style.bottom = '20px';
  host.style.right = '20px';
  host.style.zIndex = '2147483647';
  
  const shadow = host.attachShadow({ mode: 'open' });
  
  const container = document.createElement('div');
  container.className = 'widget-container';
  
  container.innerHTML = `
    <div class="header">
      <span class="title">🎯 Element Grabber</span>
    </div>
    <div id="ai-mod-grabber-status" class="status">Selected: 0 element(s)</div>
    
    <div id="ai-mod-grabber-controls" class="controls" style="display: none;">
      <div class="refine-title">Refine Last Selection</div>
      <div class="refine-buttons">
        <button id="ai-mod-grab-parent" class="btn btn-sm btn-secondary flex-1">↑ Parent</button>
        <button id="ai-mod-grab-child" class="btn btn-sm btn-secondary flex-1">↓ Child</button>
        <button id="ai-mod-grab-similar" class="btn btn-sm btn-primary flex-1">⚭ Similar</button>
      </div>
    </div>

    <div class="footer-buttons">
      <button id="ai-mod-grab-finalise" class="btn btn-primary">Finalise</button>
      <button id="ai-mod-grab-cancel" class="btn btn-secondary">Cancel</button>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .widget-container {
      width: 240px;
      background-color: rgba(9, 9, 11, 0.95);
      border: 1px solid rgba(63, 63, 70, 0.6);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      color: #f4f4f5;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      font-size: 13px;
      overflow: hidden;
      box-sizing: border-box;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
      color: #f4f4f5;
    }
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status {
      font-size: 11px;
      color: #a1a1aa;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .controls {
      flex-direction: column;
      gap: 8px;
      margin-bottom: 2px;
      background: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(63, 63, 70, 0.4);
    }
    .refine-title {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      text-align: center;
      color: #a1a1aa;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .refine-buttons {
      display: flex;
      gap: 6px;
      justify-content: center;
      width: 100%;
    }
    .footer-buttons {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .btn {
      flex: 1;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 11px;
      cursor: pointer;
      border: none;
      transition: background-color 0.2s, background 0.2s;
      outline: none;
      text-align: center;
      box-sizing: border-box;
    }
    .flex-1 {
      flex: 1;
    }
    .btn-sm {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
    }
    .btn-primary {
      background-color: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    .btn-secondary {
      background-color: #27272a;
      color: #e4e4e7;
      border: 1px solid rgba(63, 63, 70, 0.8);
    }
    .btn-secondary:hover {
      background-color: #3f3f46;
    }
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(host);
  
  shadow.querySelector('#ai-mod-grab-cancel').addEventListener('click', () => {
    chrome.storage.local.set({ elementPickerActive: false });
  });
  
  shadow.querySelector('#ai-mod-grab-finalise').addEventListener('click', async () => {
    await new Promise(resolve => {
      chrome.storage.local.set({ 
        grabbedElements: stagedElements,
        elementPickerActive: false 
      }, resolve);
    });
    chrome.runtime.sendMessage({ action: 'REOPEN_POPUP' });
  });
  
  shadow.querySelector('#ai-mod-grab-parent').addEventListener('click', (e) => {
    e.stopPropagation();
    if (lastGrabbedDOMNode && lastGrabbedDOMNode.parentElement && lastGrabbedDOMNode.parentElement !== document.body) {
      const parent = lastGrabbedDOMNode.parentElement;
      replaceLastSelection(parent, buildContextForElement(parent));
    }
  });

  shadow.querySelector('#ai-mod-grab-child').addEventListener('click', (e) => {
    e.stopPropagation();
    if (lastGrabbedDOMNode && lastGrabbedDOMNode.firstElementChild) {
      const child = lastGrabbedDOMNode.firstElementChild;
      replaceLastSelection(child, buildContextForElement(child));
    }
  });

  shadow.querySelector('#ai-mod-grab-similar').addEventListener('click', (e) => {
    e.stopPropagation();
    if (lastGrabbedDOMNode) {
      const tag = lastGrabbedDOMNode.tagName.toLowerCase();
      let genericSelector = tag;
      if (typeof lastGrabbedDOMNode.className === 'string' && lastGrabbedDOMNode.className.trim()) {
        const classes = lastGrabbedDOMNode.className.split(/\s+/).filter(c => c && !c.includes(':') && !isDynamicClass(c) && !isCommonUtilityClass(c));
        if (classes.length > 0) {
          genericSelector = `${tag}.${classes[0]}`;
        }
      }
      const context = buildContextForElement(lastGrabbedDOMNode, genericSelector, true);
      
      stagedElements.pop();
      stagedElements.push(context);
      
      document.querySelectorAll(genericSelector).forEach(node => {
        if (node !== lastGrabbedDOMNode) {
          setSolidOutline(node);
        }
      });
      
      const btn = shadow.querySelector('#ai-mod-grab-similar');
      btn.textContent = '✓ Selected All';
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.textContent = '⚭ Similar';
        btn.style.background = '';
      }, 1500);
    }
  });
  
  document.addEventListener('mouseover', onPickerMouseOver, true);
  document.addEventListener('mouseout', onPickerMouseOut, true);
  document.addEventListener('click', onPickerClick, true);
}

function stopElementPickerMode() {
  const widget = document.getElementById('ai-mod-grabber-widget');
  if (widget) widget.remove();
  
  if (pickerHoveredElement) {
    pickerHoveredElement.style.outline = pickerOriginalBorder;
    pickerHoveredElement = null;
  }
  
  clearAllSelectedOutlines();
  
  document.removeEventListener('mouseover', onPickerMouseOver, true);
  document.removeEventListener('mouseout', onPickerMouseOut, true);
  document.removeEventListener('click', onPickerClick, true);
}

function onPickerMouseOver(e) {
  if (e.target.closest && e.target.closest('#ai-mod-grabber-widget')) return;
  if (e.composedPath && e.composedPath().some(el => el.id === 'ai-mod-grabber-widget')) return;
  if (selectedNodesSet.has(e.target)) return; // Don't override selected style

  if (pickerHoveredElement && !selectedNodesSet.has(pickerHoveredElement)) {
    pickerHoveredElement.style.outline = pickerOriginalBorder;
  }
  
  pickerHoveredElement = e.target;
  pickerOriginalBorder = e.target.style.outline;
  e.target.style.outline = '2px dashed #6366f1'; 
}

function onPickerMouseOut(e) {
  if (pickerHoveredElement === e.target && !selectedNodesSet.has(e.target)) {
    e.target.style.outline = pickerOriginalBorder;
    pickerHoveredElement = null;
  }
}

async function onPickerClick(e) {
  if (e.target.closest && e.target.closest('#ai-mod-grabber-widget')) return;
  if (e.composedPath && e.composedPath().some(el => el.id === 'ai-mod-grabber-widget')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const el = e.target;
  
  // If already selected, maybe deselect?
  if (selectedNodesSet.has(el)) {
    clearSolidOutline(el);
    stagedElements = stagedElements.filter(ctx => ctx.selector !== generateSelector(el) && ctx.selector !== generateSelector(lastGrabbedDOMNode));
    if (lastGrabbedDOMNode === el) lastGrabbedDOMNode = null;
    updateGrabberWidgetUI();
    return;
  }
  
  // Clean up hover state outline
  if (pickerHoveredElement === el) {
    el.style.outline = pickerOriginalBorder;
    pickerHoveredElement = null;
  }
  
  lastGrabbedDOMNode = el;
  setSolidOutline(el);
  
  const context = buildContextForElement(el);
  stagedElements.push(context);
  
  updateGrabberWidgetUI();
}

chrome.storage.local.get(['isRecording', 'recordedEvents', 'healingInfo', 'elementPickerActive'], (result) => {
  isRecording = !!result.isRecording;
  if (isRecording) {
    lastEventTime = Date.now();
    createWidget();
    updateWidget(result.recordedEvents || []);
  }
  if (result.healingInfo) {
    healingInfo = result.healingInfo;
    startHealingMode();
  }
  if (result.elementPickerActive) {
    elementPickerActive = true;
    startElementPickerMode();
  }
});

// 5. Listen for recording toggles and updates across popup/background
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isRecording !== undefined) {
      isRecording = changes.isRecording.newValue;
      console.log('Automage: Recording state changed to', isRecording);
      if (isRecording) {
        lastEventTime = Date.now();
        createWidget();
      } else {
        removeWidget();
      }
    }
    if (changes.recordedEvents !== undefined && isRecording) {
      updateWidget(changes.recordedEvents.newValue || []);
    }
    if (changes.mods !== undefined) {
      activePageMods = changes.mods.newValue || [];
    }
    if (changes.healingInfo !== undefined) {
      healingInfo = changes.healingInfo.newValue;
      if (healingInfo) {
        startHealingMode();
      } else {
        stopHealingMode();
      }
    }
    if (changes.elementPickerActive !== undefined) {
      elementPickerActive = changes.elementPickerActive.newValue;
      if (elementPickerActive) {
        startElementPickerMode();
      } else {
        stopElementPickerMode();
      }
    }
  }
});

const getPageStructure = () => {
  try {
    const title = document.title;
    const url = window.location.href;
    
    // Fast O(1) selector generation specifically for compilation context
    const getFastSelector = (el) => {
      if (!el) return '';
      const tag = el.tagName.toLowerCase();
      if (el.id && /^[a-z][a-z0-9_-]*$/i.test(el.id)) {
        return `#${el.id}`;
      }
      for (const attr of ['data-testid', 'data-test', 'data-qa', 'data-cy']) {
        if (el.hasAttribute(attr)) {
          return `[${attr}="${el.getAttribute(attr)}"]`;
        }
      }
      if (el.hasAttribute('name')) {
        return `${tag}[name="${el.getAttribute('name')}"]`;
      }
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && !isDynamicClass(c) && !isCommonUtilityClass(c));
        if (classes.length > 0) {
          return `${tag}.${classes[0]}`;
        }
      }
      return tag;
    };

    // Find key interactive elements
    const elements = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], [contenteditable="true"]'));
    
    // Limit to 50 elements for speed and prompt size optimization
    const elementSummary = elements.slice(0, 50).map(el => {
      const summary = {
        tag: el.tagName.toLowerCase(),
        selector: getFastSelector(el)
      };
      
      if (el.id) summary.id = el.id;
      
      if (el.className && typeof el.className === 'string') {
        summary.classes = el.className.split(/\s+/).filter(c => c && !isCommonUtilityClass(c)).slice(0, 5).join(' ');
      }
      
      if (el.placeholder) summary.placeholder = el.placeholder;
      if (el.name) summary.name = el.name;
      
      const text = (el.innerText || el.value || '').trim();
      if (text) {
        summary.text = text.substring(0, 50);
      }
      
      const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-testid');
      if (label) {
        summary.label = label;
      }
      
      return summary;
    });
    
    const forms = Array.from(document.querySelectorAll('form')).slice(0, 10).map(f => {
      return {
        selector: getFastSelector(f),
        id: f.id || undefined,
        action: f.getAttribute('action') || undefined,
        method: f.getAttribute('method') || undefined
      };
    });
    
    return JSON.stringify({
      url,
      title,
      forms,
      interactiveElements: elementSummary
    }, null, 2);
  } catch (err) {
    return `Failed to extract DOM structure: ${err.message}`;
  }
};

// Listen for playback commands and cross-origin XHR responses from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PLAY_MACRO') { 
    playMacro(request.payload.events); 
    sendResponse({ status: 'playing' }); 
  } else if (request.action === 'STOP_MACRO') {
    isPlaybackCancelled = true;
    removePlaybackBanner();
    sendResponse({ status: 'stopped' });
  } else if (request.action === 'GM_XHR_RESPONSE') {
    const { reqId, callbackType, response } = request.payload;
    window.postMessage({
      type: 'GM_XHR_CALLBACK',
      token: bridgeToken,
      reqId: reqId,
      callbackType: callbackType,
      response: response
    }, '*');
  } else if (request.action === 'GET_BRIDGE_TOKEN') {
    sendResponse({ token: bridgeToken });
  } else if (request.action === 'GET_DOM_STRUCTURE') {
    try {
      const structure = getPageStructure();
      sendResponse({ status: 'success', structure: structure });
    } catch (err) {
      sendResponse({ status: 'error', message: err.message });
    }
  }
});

// Greasemonkey XHR Request Bridge (Isolated World)
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.token !== bridgeToken) return;
  
  if (data.type === 'GM_XHR_REQUEST') {
    chrome.runtime.sendMessage({
      action: 'GM_XHR_FETCH',
      payload: {
        reqId: data.reqId,
        details: data.details
      }
    }).catch(err => {
      window.postMessage({
        type: 'GM_XHR_CALLBACK',
        token: bridgeToken,
        reqId: data.reqId,
        callbackType: 'onerror',
        response: { error: err.message }
      }, '*');
    });
  } else if (data.type === 'GM_XHR_ABORT') {
    chrome.runtime.sendMessage({
      action: 'GM_XHR_ABORT',
      payload: { reqId: data.reqId }
    }).catch(() => {});
  }
});

const isStableId = (id) => {
  if (!id || typeof id !== 'string') return false;
  if (/^\d/.test(id)) return false; 
  if (/\d{4,}/.test(id)) return false; 
  if (/^[:_]/.test(id)) return false; 
  if (id.includes('ember') || id.includes('react') || id.includes('vue') || id.includes('angular') || id.includes('next')) return false; 
  if (/[a-f0-9]{8,}/i.test(id)) return false; 
  return true;
};

const isDynamicClass = (c) => {
  if (!c || typeof c !== 'string') return true;
  if (/^(css|jss|ng|vue|react|ember)-/.test(c)) return true;
  if (/^[a-z0-9]{4,10}$/i.test(c) && /\d/.test(c)) return true; 
  if (/[a-f0-9]{8,}/i.test(c)) return true; 
  return false;
};

const isCommonUtilityClass = (c) => {
  if (!c || typeof c !== 'string') return true;
  const commonTailwind = [
    'flex', 'grid', 'block', 'inline', 'hidden', 'absolute', 'relative', 'fixed', 'sticky',
    'items-center', 'justify-center', 'justify-between', 'gap-', 'space-',
    'p-', 'px-', 'py-', 'm-', 'mx-', 'my-', 'pt-', 'pb-', 'pl-', 'pr-', 'mt-', 'mb-', 'ml-', 'mr-',
    'w-', 'h-', 'max-w', 'min-w', 'max-h', 'min-h',
    'bg-', 'text-', 'border-', 'rounded-', 'shadow-', 'opacity-',
    'hover:', 'focus:', 'active:', 'dark:', 'md:', 'lg:', 'xl:',
    'cursor-pointer', 'overflow-', 'z-', 'transition', 'duration-', 'ease-',
    'font-', 'leading-', 'tracking-', 'text-center', 'text-left', 'text-right'
  ];
  return commonTailwind.some(prefix => c.startsWith(prefix));
};

const getStableAttributeSelector = (element) => {
  const tag = element.tagName.toLowerCase();
  
  for (const attr of ['data-testid', 'data-test', 'data-qa', 'data-cy']) {
    if (element.hasAttribute(attr)) {
      return `[${attr}="${element.getAttribute(attr)}"]`;
    }
  }
  
  if (element.hasAttribute('name')) {
    return `${tag}[name="${element.getAttribute('name')}"]`;
  }
  
  for (const attr of ['aria-label', 'title', 'placeholder']) {
    if (element.hasAttribute(attr)) {
      const val = element.getAttribute(attr).trim();
      if (val) {
        return `${tag}[${attr}="${val}"]`;
      }
    }
  }
  
  if (element.hasAttribute('role')) {
    const role = element.getAttribute('role').trim();
    if (role && role !== 'presentation' && role !== 'none') {
      return `${tag}[role="${role}"]`;
    }
  }
  
  return null;
};

const generateSelector = (el) => {
  if (!el) return '';
  
  // 1. Traverse up to the closest interactive element
  let targetEl = el;
  const interactive = el.closest('button, a, input, textarea, select, [role="button"], [contenteditable="true"]');
  if (interactive) {
    targetEl = interactive;
  }
  
  const tag = targetEl.tagName.toLowerCase();
  
  const isUnique = (sel) => {
    try {
      return document.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  };

  // 2. Try stable ID
  if (targetEl.id && isStableId(targetEl.id)) {
    const sel = `#${targetEl.id}`;
    if (isUnique(sel)) return sel;
  }
  
  // 3. Try unique stable attribute
  const attrSel = getStableAttributeSelector(targetEl);
  if (attrSel && isUnique(attrSel)) {
    return attrSel;
  }
  
  // 4. Try tag name + specific attributes/classes combined
  if (targetEl.className && typeof targetEl.className === 'string') {
    const classes = targetEl.className.trim().split(/\s+/)
      .filter(c => c && !c.includes(':') && !isDynamicClass(c) && !isCommonUtilityClass(c));
    if (classes.length > 0) {
      const classSel = `${tag}.${classes.join('.')}`;
      if (isUnique(classSel)) return classSel;
    }
  }

  // 5. Build hierarchical path
  let path = [];
  let current = targetEl;
  while (current && current.tagName && current.tagName !== 'HTML') {
    let currentTag = current.tagName.toLowerCase();
    
    if (current.id && isStableId(current.id)) {
      path.unshift(`#${current.id}`);
      break; 
    }
    
    const currentAttrSel = getStableAttributeSelector(current);
    if (currentAttrSel) {
      path.unshift(currentAttrSel);
      break; 
    }
    
    let currentSel = currentTag;
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
        .filter(c => c && !c.includes(':') && !isDynamicClass(c) && !isCommonUtilityClass(c));
      if (classes.length > 0) {
        currentSel += `.${classes[0]}`; 
      }
    }
    
    let sibling = current, nth = 1;
    while ((sibling = sibling.previousElementSibling)) nth++;
    currentSel += `:nth-child(${nth})`;
    
    path.unshift(currentSel);
    
    const partialSel = path.join(' > ');
    if (isUnique(partialSel)) {
      return partialSel;
    }
    
    current = current.parentElement;
  }
  
  return path.length ? path.join(' > ') : (targetEl.tagName ? targetEl.tagName.toLowerCase() : '');
};

// Clicks listener
document.addEventListener('click', (e) => {
  if (!isRecording) return;
  if (isEventInsideWidget(e)) return;
  
  const now = Date.now();
  const delay = now - lastEventTime;
  lastEventTime = now;
  
  chrome.runtime.sendMessage({ 
    action: 'EVENT_RECORDED', 
    payload: { type: 'click', target: generateSelector(e.target), delay: delay, time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) } 
  }).catch(() => {
    // Ignore error when background is inactive/reloaded
  });
}, true);

// Inputs listener (captures keystrokes dynamically)
document.addEventListener('input', (e) => {
  if (!isRecording) return;
  if (isEventInsideWidget(e)) return;
  
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    const now = Date.now();
    const delay = now - lastEventTime;
    lastEventTime = now;
    
    chrome.runtime.sendMessage({ 
      action: 'EVENT_RECORDED', 
      payload: { 
        type: 'type', 
        target: generateSelector(e.target), 
        value: e.target.value || e.target.innerText || '', 
        delay: delay,
        time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) 
      } 
    }).catch(() => {
      // Ignore error when background is inactive/reloaded
    });
  }
}, true);

// Keystrokes Enter and Arrow keys listener (KeyDown handles initial state)
document.addEventListener('keydown', (e) => {
  if (!isRecording) return;
  if (isEventInsideWidget(e)) return;
  
  const recordableKeys = ['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (recordableKeys.includes(e.key)) {
    if (e.repeat) return; // Ignore autorepeats to aggregate keyhold
    
    heldKeys[e.key] = {
      startTime: Date.now(),
      target: generateSelector(e.target),
      delay: Date.now() - lastEventTime,
      time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
    };
  }
}, true);

// Keystrokes KeyUp listener to determine keypress vs keyhold
document.addEventListener('keyup', (e) => {
  if (!isRecording) return;
  if (isEventInsideWidget(e)) return;
  
  if (heldKeys[e.key]) {
    const held = heldKeys[e.key];
    const duration = Date.now() - held.startTime;
    lastEventTime = Date.now();
    
    const isHold = duration > 250;
    const eventPayload = {
      type: isHold ? 'keyhold' : 'keypress',
      key: e.key,
      target: held.target,
      delay: held.delay,
      time: held.time
    };
    if (isHold) {
      eventPayload.duration = duration;
    }
    
    chrome.runtime.sendMessage({
      action: 'EVENT_RECORDED',
      payload: eventPayload
    }).catch(() => {
      // Ignore error when background is inactive/reloaded
    });
    
    delete heldKeys[e.key];
  }
}, true);

// Playback Highlighter Helpers
function highlightElement(el) {
  let hl = document.getElementById('ai-mod-playback-highlighter');
  if (!hl) {
    hl = document.createElement('div');
    hl.id = 'ai-mod-playback-highlighter';
    hl.style.position = 'absolute';
    hl.style.pointerEvents = 'none';
    hl.style.zIndex = '2147483647';
    hl.style.border = '2px solid #3b82f6';
    hl.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    hl.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.5), inset 0 0 4px rgba(59, 130, 246, 0.2)';
    hl.style.transition = 'all 0.15s ease-out';
    
    const style = document.createElement('style');
    style.id = 'ai-mod-highlighter-style';
    style.innerHTML = `
      @keyframes mod-pulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.02); opacity: 1; box-shadow: 0 0 18px rgba(59, 130, 246, 0.8), inset 0 0 6px rgba(59, 130, 246, 0.3); }
        100% { transform: scale(1); opacity: 0.9; }
      }
      #ai-mod-playback-highlighter.pulse {
        animation: mod-pulse 0.6s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hl);
  }
  
  const rect = el.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  const computedStyle = window.getComputedStyle(el);
  
  hl.style.top = `${rect.top + scrollTop}px`;
  hl.style.left = `${rect.left + scrollLeft}px`;
  hl.style.width = `${rect.width}px`;
  hl.style.height = `${rect.height}px`;
  hl.style.borderRadius = computedStyle.borderRadius;
  hl.style.display = 'block';
  hl.classList.add('pulse');
}

function removeHighlight() {
  const hl = document.getElementById('ai-mod-playback-highlighter');
  if (hl) {
    hl.style.display = 'none';
    hl.classList.remove('pulse');
  }
}

// Playback Engine
async function playMacro(events) {
  if (!events || !events.length) return;
  
  isPlaybackCancelled = false;
  createPlaybackBanner(events.length);
  
  // Load playback delay from local storage (default 1000ms)
  const delayObj = await new Promise((resolve) => {
    chrome.storage.local.get(['playbackDelay'], (res) => resolve(res));
  });
  const stepDelayVal = delayObj && delayObj.playbackDelay !== undefined ? parseInt(delayObj.playbackDelay) : 1000;
  const stepDelay = (isNaN(stepDelayVal) || stepDelayVal < 100) ? 1000 : stepDelayVal;
  
  try {
    let currentIdx = 0;
    for (let evt of events) {
      if (isPlaybackCancelled) {
        console.log("Automage: Playback cancelled by user.");
        break;
      }
      currentIdx++;
      updatePlaybackStep(currentIdx, events.length);
      
      const el = document.querySelector(evt.target);
      if (!el) continue;
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for scroll to settle
        
        highlightElement(el);
        
        if (evt.type === 'click') {
          el.click();
        } else if (evt.type === 'type') {
          el.value = evt.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (evt.type === 'keypress') {
          if (evt.key === 'Enter') {
            const enterDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
            const enterUp = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
            el.dispatchEvent(enterDown);
            el.dispatchEvent(enterUp);
            if (el.form) el.form.submit();
          } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(evt.key)) {
            const keyCodeMap = { 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
            const codeMap = { 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight' };
            const keyCode = keyCodeMap[evt.key];
            const code = codeMap[evt.key];
            
            const keydown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: evt.key, code: code, keyCode: keyCode, which: keyCode });
            const keyup = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: evt.key, code: code, keyCode: keyCode, which: keyCode });
            
            el.dispatchEvent(keydown);
            el.dispatchEvent(keyup);
          }
        } else if (evt.type === 'keyhold') {
          const duration = evt.duration || 1000;
          const keyCodeMap = { 'Enter': 13, 'ArrowUp': 38, 'ArrowDown': 40, 'ArrowLeft': 37, 'ArrowRight': 39 };
          const codeMap = { 'Enter': 'Enter', 'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight' };
          const keyCode = keyCodeMap[evt.key] || 13;
          const code = codeMap[evt.key] || 'Enter';
          
          const keydown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: evt.key, code: code, keyCode: keyCode, which: keyCode });
          const keyup = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: evt.key, code: code, keyCode: keyCode, which: keyCode });
          
          el.dispatchEvent(keydown);
          
          // Hold the key for the specified duration (check cancel during hold)
          let heldElapsed = 0;
          const holdInterval = 100;
          const keydownRepeat = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: evt.key, code: code, keyCode: keyCode, which: keyCode, repeat: true });
          while (heldElapsed < duration) {
            if (isPlaybackCancelled) break;
            await new Promise(resolve => setTimeout(resolve, Math.min(holdInterval, duration - heldElapsed)));
            heldElapsed += holdInterval;
            if (heldElapsed < duration && !isPlaybackCancelled) {
              el.dispatchEvent(keydownRepeat);
            }
          }
          
          el.dispatchEvent(keyup);
        }
      } catch {
        // Ignore element access errors
      }
      const parsedDelay = (evt.delay !== undefined && evt.delay !== null && evt.delay !== '') ? parseInt(evt.delay) : NaN;
      const currentDelay = (isNaN(parsedDelay) || parsedDelay < 0) ? stepDelay : parsedDelay;
      
      // Sleep delay with incremental cancellation checks
      let elapsed = 0;
      const interval = 100;
      while (elapsed < currentDelay) {
        if (isPlaybackCancelled) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(interval, currentDelay - elapsed)));
        elapsed += interval;
      }
      removeHighlight();
    }
  } finally {
    removeHighlight();
    removePlaybackBanner();
  }
}

// 6. Floating Control Widget Implementation (Shadow DOM)
function createWidget() {
  if (document.getElementById('ai-mod-recording-widget')) return;
  
  const host = document.createElement('div');
  host.id = 'ai-mod-recording-widget';
  host.style.position = 'fixed';
  host.style.bottom = '20px';
  host.style.right = '20px';
  host.style.zIndex = '2147483647';
  
  // Keep it absolutely isolated from page stylesheets
  const shadow = host.attachShadow({ mode: 'open' });
  
  // Create container
  const container = document.createElement('div');
  container.className = 'widget-container';
  
  // HTML layout
  container.innerHTML = `
    <!-- View 1: Recording -->
    <div id="recording-view" class="view">
      <div class="header">
        <span class="indicator animate-pulse"></span>
        <span class="title">Recording Macro</span>
      </div>
      <div class="step-count" id="step-count-text">0 steps recorded</div>
      <div class="steps-list" id="steps-list-container">
        <div class="empty-msg">Perform actions on the page...</div>
      </div>
      <div class="footer-buttons">
        <button id="save-btn" class="btn btn-primary">Stop & Save</button>
        <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
    
    <!-- View 2: Save Dialog -->
    <div id="save-view" class="view hidden">
      <div class="header">
        <span class="title">Save Macro</span>
      </div>
      <div class="form-group">
        <input type="text" id="macro-title-input" class="input" placeholder="Macro name..." />
      </div>
      <div class="footer-buttons">
        <button id="confirm-save-btn" class="btn btn-primary">Save</button>
        <button id="back-btn" class="btn btn-secondary">Back</button>
      </div>
    </div>
  `;
  
  // Stylesheets
  const style = document.createElement('style');
  style.textContent = `
    .widget-container {
      width: 280px;
      background-color: rgba(9, 9, 11, 0.95);
      border: 1px solid rgba(63, 63, 70, 0.6);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      color: #f4f4f5;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      font-size: 13px;
      overflow: hidden;
      box-sizing: border-box;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .view {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .view.hidden {
      display: none;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 13px;
      color: #f4f4f5;
    }
    .indicator {
      width: 8px;
      height: 8px;
      background-color: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 8px #ef4444;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .step-count {
      color: #a1a1aa;
      font-weight: 500;
    }
    .steps-list {
      background-color: #18181b;
      border: 1px solid rgba(63, 63, 70, 0.4);
      border-radius: 6px;
      padding: 8px;
      max-height: 120px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .empty-msg {
      color: #52525b;
      text-align: center;
      font-style: italic;
      padding: 10px 0;
    }
    .step-item {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      color: #d4d4d8;
      border-bottom: 1px solid rgba(63, 63, 70, 0.2);
      padding-bottom: 2px;
    }
    .step-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .step-time {
      color: #71717a;
      flex-shrink: 0;
    }
    .step-type {
      color: #3b82f6;
      font-weight: bold;
      flex-shrink: 0;
    }
    .step-target {
      flex-grow: 1;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 150px;
      color: #a1a1aa;
    }
    .footer-buttons {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .btn {
      flex: 1;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 11px;
      cursor: pointer;
      border: none;
      transition: background-color 0.2s;
      outline: none;
      text-align: center;
    }
    .btn-primary {
      background-color: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    .btn-secondary {
      background-color: #27272a;
      color: #e4e4e7;
      border: 1px solid rgba(63, 63, 70, 0.8);
    }
    .btn-secondary:hover {
      background-color: #3f3f46;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .input {
      background-color: #09090b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      color: #f4f4f5;
      padding: 8px 10px;
      font-size: 12px;
      outline: none;
    }
    .input:focus {
      border-color: #2563eb;
    }
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(host);
  widgetElement = host;
  
  // Set up event listeners inside the shadow DOM
  const saveBtn = shadow.getElementById('save-btn');
  const cancelBtn = shadow.getElementById('cancel-btn');
  const confirmSaveBtn = shadow.getElementById('confirm-save-btn');
  const backBtn = shadow.getElementById('back-btn');
  
  const recView = shadow.getElementById('recording-view');
  const saveView = shadow.getElementById('save-view');
  const titleInput = shadow.getElementById('macro-title-input');
  
  saveBtn.addEventListener('click', () => {
    recView.classList.add('hidden');
    saveView.classList.remove('hidden');
    titleInput.value = `Macro - ${window.location.hostname} - ${new Date().toLocaleDateString()}`;
    titleInput.focus();
  });
  
  cancelBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      isRecording: false,
      recordedEvents: []
    });
  });
  
  backBtn.addEventListener('click', () => {
    saveView.classList.add('hidden');
    recView.classList.remove('hidden');
  });
  
  confirmSaveBtn.addEventListener('click', () => {
    const name = titleInput.value.trim() || `Macro - ${window.location.hostname}`;
    chrome.storage.local.get(['recordedEvents', 'mods'], (result) => {
      const recordedEvents = result.recordedEvents || [];
      const mods = result.mods || [];
      
      const newMod = {
        id: Date.now(),
        title: name,
        type: 'Macro',
        events: recordedEvents,
        active: true
      };
      
      chrome.storage.local.set({
        mods: [...mods, newMod],
        recordedEvents: [],
        isRecording: false
      });
    });
  });
}

function updateWidget(events) {
  if (!widgetElement) return;
  const shadow = widgetElement.shadowRoot;
  if (!shadow) return;
  
  const stepCountText = shadow.getElementById('step-count-text');
  const listContainer = shadow.getElementById('steps-list-container');
  
  if (stepCountText) {
    stepCountText.textContent = `${events.length} step${events.length === 1 ? '' : 's'} recorded`;
  }
  
  if (listContainer) {
    if (events.length === 0) {
      listContainer.innerHTML = '<div class="empty-msg">Perform actions on the page...</div>';
    } else {
      listContainer.innerHTML = '';
      // Show only last 5 events
      const sliced = events.slice(-5);
      sliced.forEach(e => {
        const item = document.createElement('div');
        item.className = 'step-item';
        
        let typeLabel = e.type;
        if (e.type === 'keypress' && e.key === 'Enter') {
          typeLabel = 'enter';
        }
        
        item.innerHTML = `
          <span class="step-time">[${e.time}]</span>
          <span class="step-type">${typeLabel}</span>
          <span class="step-target" title="${e.target}">${e.target}</span>
        `;
        listContainer.appendChild(item);
      });
      // Scroll to bottom
      listContainer.scrollTop = listContainer.scrollHeight;
    }
  }
}

function removeWidget() {
  const widget = document.getElementById('ai-mod-recording-widget');
  if (widget) {
    widget.remove();
  }
  widgetElement = null;
}

// 7. Keybindings listener to trigger scripts or macros
document.addEventListener('keydown', (e) => {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl.tagName === 'INPUT' || 
    activeEl.tagName === 'TEXTAREA' || 
    activeEl.isContentEditable
  );
  
  const pressedKeys = [];
  if (e.ctrlKey) pressedKeys.push('Ctrl');
  if (e.altKey) pressedKeys.push('Alt');
  if (e.shiftKey) pressedKeys.push('Shift');
  if (e.metaKey) pressedKeys.push('Meta');
  
  let primaryKey = e.key;
  if (!primaryKey) {
    return; // Ignore events without a key property
  }
  if (primaryKey === 'Control' || primaryKey === 'Shift' || primaryKey === 'Alt' || primaryKey === 'Meta') {
    return; // Ignore lone modifiers
  }
  if (primaryKey === ' ') primaryKey = 'Space';
  else if (primaryKey.length === 1) primaryKey = primaryKey.toUpperCase();
  
  pressedKeys.push(primaryKey);
  const pressedCombo = pressedKeys.slice(0, 4).join('+');
  
  const hasModifiers = e.ctrlKey || e.altKey || e.metaKey;
  if (isTyping && !hasModifiers) {
    return;
  }
  
  const currentUrl = window.location.href;
  
  activePageMods.forEach(mod => {
    if (mod.active && mod.keybinding === pressedCombo) {
      const pattern = mod.matchPattern || mod.domain || '*';
      if (urlMatchesPattern(currentUrl, pattern)) {
        console.log(`Automage: Keybinding triggered mod "${mod.title}" via [${pressedCombo}]`);
        if (mod.type === 'JS') {
          chrome.runtime.sendMessage({
            action: 'EXECUTE_MOD',
            payload: mod
          }).catch(err => {
            console.warn("Could not execute keybinding mod:", err);
          });
        } else if (mod.type === 'CSS') {
          const toggledCSS = window._ai_mod_toggled_css = window._ai_mod_toggled_css || {};
          const isInserted = toggledCSS[mod.id];
          chrome.runtime.sendMessage({
            action: isInserted ? 'REMOVE_CSS' : 'INSERT_CSS',
            payload: {
              id: mod.id,
              code: mod.code
            }
          }).then(() => {
            toggledCSS[mod.id] = !isInserted;
          }).catch(err => {
            console.warn("Could not toggle CSS keybinding:", err);
          });
        } else if (mod.type === 'Macro') {
          playMacro(mod.events);
        }
      }
    }
  });
});