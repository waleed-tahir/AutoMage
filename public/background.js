// background.js - Manifest V3 Service Worker

const activeXhrRequests = new Map();

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.storage.local.set({
        mods: [],
        alerts: [],
        llmProvider: 'groq',
        apiKeys: { 
          openai: '', 
          anthropic: '', 
          grok: '', 
          groq: '', 
          gemini: '' 
        }
      });
    }
  });

// Register declarativeNetRequest rules to remove CSP headers so our scripts can run on strict sites
const updateCspRules = () => {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'content-security-policy', operation: 'remove' },
          { header: 'content-security-policy-report-only', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame']
      }
    }
  ];
  
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: rules
  }).catch(err => {
    console.warn("Could not register CSP removal rules:", err);
  });
};

updateCspRules();
  
  // Extract code blocks from AI markdown responses safely
  const extractCode = (markdown) => {
    const cssMatch = markdown.match(/```css\n([\s\S]*?)```/);
    if (cssMatch) return { type: 'CSS', code: cssMatch[1] };
    
    const jsMatch = markdown.match(/```(?:javascript|js)\n([\s\S]*?)```/);
    if (jsMatch) return { type: 'JS', code: jsMatch[1] };
    
    return { type: 'JS', code: markdown.replace(/```.*/g, '') }; // Fallback
  };
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'REOPEN_POPUP') {
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().catch(err => console.log('Failed to open popup automatically:', err));
      }
      return sendResponse({ status: 'ok' });
    }
    
    if (request.action === 'COMPILE_PROMPT' || request.action === 'MODIFY_SCRIPT_PROMPT') {
      chrome.storage.local.get(['llmProvider', 'apiKeys', 'maxRetries'], async (config) => {
        const defaultKeys = { 
          openai: '', 
          anthropic: '', 
          grok: '', 
          groq: '', 
          gemini: '' 
        };
        let provider = config.llmProvider || 'groq';
        
        // Merge stored keys with default keys, handling legacy/default location
        const storedKeys = config.apiKeys || {};
        let grokKey = storedKeys.grok || '';
        let groqKey = storedKeys.groq || '';
        
        // If the grok key is actually a Groq key (starts with gsk_), route it to groq key if empty
        if (grokKey.startsWith('gsk_')) {
          if (!groqKey) groqKey = grokKey;
          grokKey = '';
        }
        
        const apiKeys = { 
          ...defaultKeys, 
          ...storedKeys,
          grok: grokKey,
          groq: groqKey
        };
        
        // Auto-detect/fallback if key prefix is gsk_
        let apiKey = apiKeys[provider];
        if (provider === 'grok' && apiKey && apiKey.startsWith('gsk_')) {
          provider = 'groq';
          apiKey = apiKeys.groq || apiKey;
        } else if (provider === 'grok' && !apiKey) {
          provider = 'groq';
          apiKey = apiKeys.groq;
        }
  
        if (!apiKey && provider !== 'ollama') {
          return sendResponse({ status: 'error', message: `Missing API Key for ${provider}` });
        }

        let maxRetries = config.maxRetries !== undefined ? parseInt(config.maxRetries) : 3;
        if (isNaN(maxRetries) || maxRetries < 1) maxRetries = 1;
        if (maxRetries > 10) maxRetries = 10;
        
        const tabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        const activeTabId = tabs?.[0]?.id;
  
        try {
          const isModify = request.action === 'MODIFY_SCRIPT_PROMPT';
          let systemPrompt = '';
          
          if (isModify) {
            systemPrompt = `You are an expert user script developer specializing in Tampermonkey scripts.
Your task: You will receive an existing Tampermonkey script, a user request for modification, and optionally the active page DOM or targeted elements.
You must update the existing script to fulfill the user's request. Keep the existing logic intact unless it conflicts with the request.

Key constraints & best practices:
1. Preserve existing metadata headers (e.g., @name, @match, @version) unless explicitly asked to change them.
2. Provide ONLY the final, modified Tampermonkey script as a single markdown code block (language javascript or css). No explanations outside the code block.
3. Keep your code high quality, safe, and dynamic-aware (use MutationObserver if necessary).`;
          } else {
            systemPrompt = `You are an expert user script developer specializing in Tampermonkey scripts for dynamic, modern web applications.

Your task: Given the target page URL, observed DOM structure, and the user’s requirement (restyling, automation, or both), write a complete, production‑ready Tampermonkey content script.

Key constraints & best practices:

1. Dynamic DOM handling
- The target page loads or modifies elements after window.load (e.g., React/Vue apps, infinite scroll, AJAX).
- Never rely on window.load or simple DOMContentLoaded alone – many elements won’t exist yet.
- Use MutationObserver to watch for the appearance of specific elements, then apply styling or automation.
- Implement a retry / wait‑for‑element helper function if a simple observer is overkill (prefer MutationObserver for performance).

2. Tampermonkey‑specific requirements
- Include a proper // ==UserScript== header block with:
  * @name, @namespace, @version, @description
  * @match or @include for the target URL(s)
  * @grant values needed (e.g., GM_addStyle, GM_setValue, GM_getValue, GM_xmlhttpRequest).
  * @run-at document-idle (or document-start if you need to block or early‑inject styles).
- If restyling is the goal, prefer GM_addStyle (injected CSS) over inline style attributes.
- For automation (clicking, filling forms, waiting for modals), ensure actions trigger only after the target element is stable and visible.

3. Code quality & safety
- Avoid infinite observer loops – disconnect the observer after changes are applied.
- Use throttle/debounce if observing high‑frequency mutations (e.g., scroll‑loaded lists).
- Never modify or override built‑in global objects unless absolutely necessary.
- If the user’s requirement is ambiguous, ask for clarification about dynamic containers, shadow DOM, or SPA routing.

4. Output format
- Provide only the final Tampermonkey script as a single code block (language javascript or css).
- Include brief comments explaining key decisions – especially how you handle dynamic elements.
- Respond ONLY with the markdown code block containing the code. No explanations outside the code block.

Example scenario (for your reference):
If the user says: “Change the background color of comment divs that load after scrolling on reddit.com” –
You would:
- Use @match https://www.reddit.com/r/*
- Use MutationObserver on the comment section container
- Apply GM_addStyle with a CSS rule for the new class
- Disconnect observer after processing each batch (or keep observing for infinite scroll)

Your response must be a ready‑to‑install script – no extraneous explanations unless absolutely necessary.`;
          }

          const userPrompt = request.payload.prompt;
          const domStructure = request.payload.domStructure;
          const targetElements = request.payload.targetElements || [];
          const existingScript = request.payload.existingScript;
          
          let fullUserPrompt = `User Request: ${userPrompt}\n\n`;
          if (isModify && existingScript) {
            fullUserPrompt += `Existing Script to Modify:\n\`\`\`javascript\n${existingScript}\n\`\`\`\n\n`;
          }
          if (targetElements && targetElements.length > 0) {
            fullUserPrompt += `🧲 Target Elements (user-selected):\n${JSON.stringify(targetElements, null, 2)}\n\n`;
          }
          if (domStructure) {
            fullUserPrompt += `Active Page DOM & Structure:\n${domStructure}`;
          }
          
          let messages = [
            { role: 'user', content: fullUserPrompt }
          ];

          let lastError = null;
          let lastExtracted = null;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              let url = '';
              let headers = { 'Content-Type': 'application/json' };
              let body = {};
      
              if (provider === 'openai') {
                url = 'https://api.openai.com/v1/chat/completions';
                headers['Authorization'] = `Bearer ${apiKey}`;
                body = {
                  model: 'gpt-4o',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                  ]
                };
              } else if (provider === 'grok') {
                url = 'https://api.x.ai/v1/chat/completions';
                headers['Authorization'] = `Bearer ${apiKey}`;
                body = {
                  model: 'grok-2',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                  ]
                };
              } else if (provider === 'groq') {
                url = 'https://api.groq.com/openai/v1/chat/completions';
                headers['Authorization'] = `Bearer ${apiKey}`;
                body = {
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                  ]
                };
              } else if (provider === 'anthropic') {
                url = 'https://api.anthropic.com/v1/messages';
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                body = {
                  model: 'claude-3-5-sonnet-20241022',
                  max_tokens: 4000,
                  system: systemPrompt,
                  messages: messages
                };
              } else {
                return sendResponse({ status: 'error', message: `Unsupported LLM Provider: ${provider}` });
              }
      
              const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
              });
      
              if (!response.ok) {
                const errBody = await response.text();
                let errMsg = `API error (status ${response.status})`;
                try {
                  const errJson = JSON.parse(errBody);
                  if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
                  else if (errJson.error) errMsg = JSON.stringify(errJson.error);
                } catch {
                  if (errBody) errMsg += `: ${errBody.slice(0, 150)}`;
                }
                throw new Error(errMsg);
              }
      
              const json = await response.json();
              let content = '';
              if (provider === 'openai' || provider === 'grok' || provider === 'groq') {
                if (json.error) throw new Error(json.error.message);
                content = json.choices?.[0]?.message?.content || '';
              } else if (provider === 'anthropic') {
                if (json.error) throw new Error(json.error.message);
                content = json.content?.[0]?.text || '';
              }
      
              const extracted = extractCode(content);
              lastExtracted = extracted;
  
              // Test execution (dry-run/execution) on active tab if JS and activeTabId is valid
              let runError = null;
              if (extracted.type === 'JS' && activeTabId) {
                try {
                  const runResult = await chrome.scripting.executeScript({
                    target: { tabId: activeTabId },
                    world: 'MAIN',
                    func: (dynamicCode) => {
                      try {
                        window.__ai_mod_success = false;
                        window.__ai_mod_last_error = null;
                        
                        const wrappedCode = `
                          (function() {
                            try {
                              window.__ai_mod_last_error = null;
                              window.__ai_mod_success = false;
                              
                              ${dynamicCode}
                              
                              window.__ai_mod_success = true;
                            } catch (e) {
                              window.__ai_mod_last_error = e.message;
                            }
                          })();
                        `;
                        
                        const script = document.createElement('script');
                        script.textContent = wrappedCode;
                        (document.head || document.documentElement).appendChild(script);
                        script.remove();
                        
                        if (!window.__ai_mod_success) {
                          return { success: false, error: window.__ai_mod_last_error || "Syntax Error or CSP Injection Blocked" };
                        }
                        return { success: true };
                      } catch (e) {
                        return { success: false, error: e.message };
                      }
                    },
                    args: [extracted.code]
                  });
                  
                  const execRes = runResult?.[0]?.result;
                  if (execRes && !execRes.success) {
                    runError = execRes.error;
                  }
                } catch (e) {
                  // If executeScript fails (e.g. extension context invalidated or on a restricted page)
                  console.warn("executeScript test run skipped or failed: ", e.message);
                }
              }
  
              if (runError) {
                console.warn(`Attempt ${attempt}: Compilation validation error: ${runError}`);
                messages.push({ role: 'assistant', content: content });
                messages.push({ role: 'user', content: `The script you generated throws an error during compilation or execution: "${runError}". Please rewrite the script to resolve this error and generate the entire code block again.` });
                lastError = runError;
                continue;
              }
  
              // No errors! Return script details
              return sendResponse({ status: 'success', ...extracted });
  
            } catch (err) {
              console.error(`Attempt ${attempt} error:`, err.message);
              lastError = err.message;
              if (err.message.includes('API key') || err.message.includes('status 401') || err.message.includes('status 403')) {
                break;
              }
            }
          }
  
          // If we ran out of attempts, send the final error
          return sendResponse({ 
            status: 'error', 
            message: `Failed after ${maxRetries} compilation attempts. Last error: ${lastError}`,
            code: lastExtracted?.code,
            type: lastExtracted?.type
          });

        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
      });
      return true; // Keep message channel open for async fetch
    }
  
    if (request.action === 'GM_XHR_FETCH') {
      const { reqId, details } = request.payload;
      const { method, url, headers, data, timeout } = details;
      
      const controller = new AbortController();
      const signal = controller.signal;
      activeXhrRequests.set(reqId, controller);
      
      const fetchOptions = {
        method: method,
        headers: headers || {},
        signal: signal
      };
      
      if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        fetchOptions.body = data;
      }
      
      const timeoutPromise = timeout ? new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      }) : null;
      
      const fetchPromise = fetch(url, fetchOptions)
        .then(async (response) => {
          const text = await response.text();
          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          
          return {
            status: response.status,
            statusText: response.statusText,
            readyState: 4,
            responseText: text,
            responseHeaders: responseHeaders
          };
        });
        
      const executionPromise = timeoutPromise ? Promise.race([fetchPromise, timeoutPromise]) : fetchPromise;
      
      executionPromise
        .then((xhrResponse) => {
          if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: 'GM_XHR_RESPONSE',
              payload: {
                reqId: reqId,
                callbackType: 'onload',
                response: xhrResponse
              }
            }).catch(() => {});
          }
          activeXhrRequests.delete(reqId);
        })
        .catch((err) => {
          const isTimeout = err.message === 'Timeout';
          if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: 'GM_XHR_RESPONSE',
              payload: {
                reqId: reqId,
                callbackType: isTimeout ? 'ontimeout' : 'onerror',
                response: { error: err.message }
              }
            }).catch(() => {});
          }
          activeXhrRequests.delete(reqId);
        });
        
      return true; // Keep message channel open for async response
    }
    
    if (request.action === 'GM_XHR_ABORT') {
      const { reqId } = request.payload;
      const controller = activeXhrRequests.get(reqId);
      if (controller) {
        controller.abort();
        activeXhrRequests.delete(reqId);
      }
      sendResponse({ status: 'aborted' });
      return;
    }
  
    if (request.action === 'INJECT_PAGE_LOAD_MOD') {
      const { mod, token } = request.payload;
      const tabId = sender.tab && sender.tab.id;
      if (!tabId) {
        sendResponse({ status: 'error', message: 'No sender tab' });
        return;
      }
      
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: (dynamicCode, id, tokenVal) => {
          try {
            const script = document.createElement('script');
            
            const wrappedCode = `
              (function() {
                const modId = ${JSON.stringify(id)};
                const prefix = "_gm_" + modId + "_";
                const bridgeToken = ${JSON.stringify(tokenVal)};
                
                const GM_info = {
                  script: {
                    name: modId,
                    version: '1.0'
                  }
                };
                
                const GM_setValue = function(key, value) {
                  localStorage.setItem(prefix + key, JSON.stringify(value));
                };
                const GM_getValue = function(key, defaultValue) {
                  const val = localStorage.getItem(prefix + key);
                  if (val === null) return defaultValue;
                  try {
                    return JSON.parse(val);
                  } catch {
                    return val;
                  }
                };
                const GM_deleteValue = function(key) {
                  localStorage.removeItem(prefix + key);
                };
                const GM_listValues = function() {
                  const keys = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(prefix)) {
                      keys.push(k.substring(prefix.length));
                    }
                  }
                  return keys;
                };
                
                const GM_addStyle = function(css) {
                  const style = document.createElement('style');
                  style.textContent = css;
                  (document.head || document.documentElement).appendChild(style);
                  return style;
                };
                
                const GM_xmlhttpRequest = function(details) {
                  const reqId = 'gm_req_' + Math.random().toString(36).substr(2, 9);
                  
                  window._gm_xhr_callbacks = window._gm_xhr_callbacks || {};
                  window._gm_xhr_callbacks[reqId] = {
                    onload: details.onload,
                    onerror: details.onerror,
                    onreadystatechange: details.onreadystatechange,
                    ontimeout: details.ontimeout,
                    onprogress: details.onprogress
                  };
                  
                  window.postMessage({
                    type: 'GM_XHR_REQUEST',
                    token: bridgeToken,
                    reqId: reqId,
                    details: {
                      method: details.method || 'GET',
                      url: details.url,
                      headers: details.headers,
                      data: details.data,
                      timeout: details.timeout
                    }
                  }, '*');
                  
                  return {
                    abort: () => {
                      window.postMessage({ type: 'GM_XHR_ABORT', token: bridgeToken, reqId: reqId }, '*');
                    }
                  };
                };
                
                const GM = {
                  setValue: (key, val) => Promise.resolve(GM_setValue(key, val)),
                  getValue: (key, def) => Promise.resolve(GM_getValue(key, def)),
                  deleteValue: (key) => Promise.resolve(GM_deleteValue(key)),
                  listValues: () => Promise.resolve(GM_listValues()),
                  xmlHttpRequest: GM_xmlhttpRequest,
                  xmlhttpRequest: GM_xmlhttpRequest,
                  addStyle: GM_addStyle,
                  info: GM_info
                };
                
                const unsafeWindow = window;
                
                ${dynamicCode}
              })();
            `;
            
            script.textContent = wrappedCode;
            (document.head || document.documentElement).appendChild(script);
            script.remove();
          } catch (e) {
            console.error("Mod Execution Error:", e);
          }
        },
        args: [mod.code, mod.id, token]
      }).then(() => sendResponse({ status: 'success' }))
        .catch(e => sendResponse({ status: 'error', message: e.message }));
      
      return true;
    }
    
    if (request.action === 'INSERT_CSS') {
      const { code } = request.payload;
      const tabId = sender.tab ? sender.tab.id : null;
      if (tabId) {
        chrome.scripting.insertCSS({ target: { tabId: tabId }, css: code })
          .then(() => sendResponse({ status: 'success' }))
          .catch(e => sendResponse({ status: 'error', message: e.message }));
      } else {
        sendResponse({ status: 'error', message: 'No tab context' });
      }
      return true;
    }
    
    if (request.action === 'REMOVE_CSS') {
      const { code } = request.payload;
      const tabId = sender.tab ? sender.tab.id : null;
      if (tabId) {
        chrome.scripting.removeCSS({ target: { tabId: tabId }, css: code })
          .then(() => sendResponse({ status: 'success' }))
          .catch(e => sendResponse({ status: 'error', message: e.message }));
      } else {
        sendResponse({ status: 'error', message: 'No tab context' });
      }
      return true;
    }
    
    if (request.action === 'EXECUTE_COMPILED_SCRIPT' || request.action === 'EXECUTE_MOD') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return sendResponse({ status: 'error', message: 'No active tab' });
  
        const type = request.payload.type || 'JS';
        const code = request.payload.code;
        const modId = request.payload.id || 'compiled';
  
        if (type === 'CSS') {
          chrome.scripting.insertCSS({ target: { tabId: tabs[0].id }, css: code })
            .then(() => sendResponse({ status: 'success' }))
            .catch(e => sendResponse({ status: 'error', message: e.message }));
        } else {
          // Query the active tab's token first
          chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_BRIDGE_TOKEN' }, (tokenRes) => {
            const token = (tokenRes && tokenRes.token) || 'token_fallback';
            
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              world: 'MAIN',
              func: (dynamicCode, id, tokenVal) => {
                try {
                  const script = document.createElement('script');
                  
                  const wrappedCode = `
                    (function() {
                      const modId = ${JSON.stringify(id)};
                      const prefix = "_gm_" + modId + "_";
                      const bridgeToken = ${JSON.stringify(tokenVal)};
                      
                      const GM_info = {
                        script: {
                          name: modId,
                          version: '1.0'
                        }
                      };
                      
                      const GM_setValue = function(key, value) {
                        localStorage.setItem(prefix + key, JSON.stringify(value));
                      };
                      const GM_getValue = function(key, defaultValue) {
                        const val = localStorage.getItem(prefix + key);
                        if (val === null) return defaultValue;
                        try {
                          return JSON.parse(val);
                        } catch {
                          return val;
                        }
                      };
                      const GM_deleteValue = function(key) {
                        localStorage.removeItem(prefix + key);
                      };
                      const GM_listValues = function() {
                        const keys = [];
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i);
                          if (k && k.startsWith(prefix)) {
                            keys.push(k.substring(prefix.length));
                          }
                        }
                        return keys;
                      };
                      
                      const GM_addStyle = function(css) {
                        const style = document.createElement('style');
                        style.textContent = css;
                        (document.head || document.documentElement).appendChild(style);
                        return style;
                      };
                      
                      const GM_xmlhttpRequest = function(details) {
                        const reqId = 'gm_req_' + Math.random().toString(36).substr(2, 9);
                        
                        window._gm_xhr_callbacks = window._gm_xhr_callbacks || {};
                        window._gm_xhr_callbacks[reqId] = {
                          onload: details.onload,
                          onerror: details.onerror,
                          onreadystatechange: details.onreadystatechange,
                          ontimeout: details.ontimeout,
                          onprogress: details.onprogress
                        };
                        
                        window.postMessage({
                          type: 'GM_XHR_REQUEST',
                          token: bridgeToken,
                          reqId: reqId,
                          details: {
                            method: details.method || 'GET',
                            url: details.url,
                            headers: details.headers,
                            data: details.data,
                            timeout: details.timeout
                          }
                        }, '*');
                        
                        return {
                          abort: () => {
                            window.postMessage({ type: 'GM_XHR_ABORT', token: bridgeToken, reqId: reqId }, '*');
                          }
                        };
                      };
                      
                      const GM = {
                        setValue: (key, val) => Promise.resolve(GM_setValue(key, val)),
                        getValue: (key, def) => Promise.resolve(GM_getValue(key, def)),
                        deleteValue: (key) => Promise.resolve(GM_deleteValue(key)),
                        listValues: () => Promise.resolve(GM_listValues()),
                        xmlHttpRequest: GM_xmlhttpRequest,
                        xmlhttpRequest: GM_xmlhttpRequest,
                        addStyle: GM_addStyle,
                        info: GM_info
                      };
                      
                      const unsafeWindow = window;
                      
                      ${dynamicCode}
                    })();
                  `;
                  
                  script.textContent = wrappedCode;
                  (document.head || document.documentElement).appendChild(script);
                  script.remove();
                } catch (e) {
                  console.error("Mod Execution Error:", e);
                }
              },
              args: [code, modId, token]
            })
            .then(() => sendResponse({ status: 'success' }))
            .catch(e => sendResponse({ status: 'error', message: e.message }));
          });
        }
      });
      return true;
    }
  
    if (request.action === 'EVENT_RECORDED') {
      chrome.storage.local.get(['recordedEvents'], (result) => {
        const events = result.recordedEvents || [];
        const newEvent = request.payload;
        
        if (events.length > 0) {
          const lastEvent = events[events.length - 1];
          if (lastEvent.type === 'type' && newEvent.type === 'type' && lastEvent.target === newEvent.target) {
            lastEvent.value = newEvent.value;
            lastEvent.time = newEvent.time;
            chrome.storage.local.set({ recordedEvents: events }, () => {
              sendResponse({ status: 'ok' });
            });
            return;
          }
        }
        
        events.push(newEvent);
        chrome.storage.local.set({ recordedEvents: events }, () => {
          sendResponse({ status: 'ok' });
        });
      });
      return true; // Keep channel open for async response
    }
  });