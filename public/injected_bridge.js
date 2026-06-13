(function() {
  const token = document.documentElement.getAttribute('data-ai-mod-token');
  if (!token) return;
  document.documentElement.removeAttribute('data-ai-mod-token');
  
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    
    if (data.type === 'GM_XHR_CALLBACK' && data.token === token) {
      const { reqId, callbackType, response } = data;
      if (window._gm_xhr_callbacks && window._gm_xhr_callbacks[reqId]) {
        const callback = window._gm_xhr_callbacks[reqId][callbackType];
        if (typeof callback === 'function') {
          callback(response);
        }
        if (['onload', 'onerror', 'ontimeout'].includes(callbackType)) {
          delete window._gm_xhr_callbacks[reqId];
        }
      }
    }
  });
})();
