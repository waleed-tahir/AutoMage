import { useState, useEffect, useRef } from 'react';


// --- UPGRADED: Chrome Storage Hook with stable initialValue ref to prevent re-render race conditions ---
function useChromeStorage(key, initialValue) {
  // Capture initialValue once at hook creation time. The ref stores it for effect access.
  // We pass a lazy initializer () => initialValue to useState to avoid reading .current during render.
  const initialValueRef = useRef(initialValue);
  const [storedValue, setStoredValue] = useState(() => initialValue);
  
  useEffect(() => {
    const initVal = initialValueRef.current;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Get initial value from storage
      chrome.storage.local.get([key], (result) => { 
        if (result[key] !== undefined) {
          if (typeof initVal === 'object' && initVal !== null && !Array.isArray(initVal) && typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
            setStoredValue({ ...initVal, ...result[key] });
          } else {
            setStoredValue(result[key]);
          }
        }
      });
      // Listen for updates from content/background scripts
      const listener = (changes, namespace) => {
        if (namespace === 'local' && key in changes) {
          setStoredValue(changes[key].newValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, [key]); // Only re-run when key changes — NOT when initialValue reference changes

  const setValue = (value) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      if (typeof chrome !== 'undefined' && chrome.storage) { 
        chrome.storage.local.set({ [key]: valueToStore }); 
      }
      return valueToStore;
    });
  };
  return [storedValue, setValue];
}

// --- Icons ---
const CrosshairIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const AlertTriangleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const EyeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const EyeOffIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const RecordIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
const PlayIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const LoaderIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>;
const CloudIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>;
const TrashIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;

const ToggleSwitch = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
    <div className="w-7 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:transition-all peer-checked:bg-blue-500"></div>
  </label>
);

export default function App() {
  const [activeTab, setActiveTab] = useChromeStorage('activeTab', 'studio');
  const [activeDomain, setActiveDomain] = useState("preview.env");
  const [toast, setToast] = useState(null);
  
  // Storage State
  const [llmProvider, setLlmProvider] = useChromeStorage('llmProvider', 'groq');
  const [apiKeys, setApiKeys] = useChromeStorage('apiKeys', { 
    openai: '', 
    anthropic: '', 
    grok: '', 
    groq: '', 
    gemini: '' 
  });
  const [rawMods, setMods] = useChromeStorage('mods', []);
  const mods = Array.isArray(rawMods) ? rawMods : [];
  
  // PERSISTENT RECORDING STATE
  const [isRecording, setIsRecording] = useChromeStorage('isRecording', false);
  const [rawRecordedEvents, setRecordedEvents] = useChromeStorage('recordedEvents', []);
  const recordedEvents = Array.isArray(rawRecordedEvents) ? rawRecordedEvents : [];
  
  // Local UI State
  const [promptText, setPromptText] = useChromeStorage('promptText', '');
  const [attachDomOnCompile, setAttachDomOnCompile] = useChromeStorage('attachDomOnCompile', false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [pendingMod, setPendingMod] = useChromeStorage('pendingMod', null);
  const [rawGrabbedElements, setGrabbedElements] = useChromeStorage('grabbedElements', []);
  const safeGrabbedElements = Array.isArray(rawGrabbedElements) ? rawGrabbedElements : [];
  
  const [modifyPrompt, setModifyPrompt] = useChromeStorage('modifyPrompt', '');
  const [attachDomOnModify, setAttachDomOnModify] = useChromeStorage('attachDomOnModify', false);
  const [isModifying, setIsModifying] = useState(false);

  // Custom Script Form State
  const [showAddScript, setShowAddScript] = useChromeStorage('showAddScript', false);
  const [scriptName, setScriptName] = useChromeStorage('scriptName', '');
  const [rawScriptMatchPatterns, setScriptMatchPatterns] = useChromeStorage('scriptMatchPatterns', ['*']);
  const scriptMatchPatterns = Array.isArray(rawScriptMatchPatterns) ? rawScriptMatchPatterns : ['*'];
  const [selectedMatchIdx, setSelectedMatchIdx] = useChromeStorage('selectedMatchIdx', 0);
  const [scriptType, setScriptType] = useChromeStorage('scriptType', 'JS');
  const [scriptCode, setScriptCode] = useChromeStorage('scriptCode', '');
  const [scriptKeybinding, setScriptKeybinding] = useChromeStorage('scriptKeybinding', '');
  const [editingScriptId, setEditingScriptId] = useChromeStorage('editingScriptId', null);
  const [rawMacroEvents, setMacroEvents] = useChromeStorage('macroEvents', []);
  const macroEvents = Array.isArray(rawMacroEvents) ? rawMacroEvents : [];
  const [playbackDelay, setPlaybackDelay] = useChromeStorage('playbackDelay', 1000);
  const [maxRetries, setMaxRetries] = useChromeStorage('maxRetries', 3);

  // Self-healing storage checks to prevent TypeErrors when types are polluted
  useEffect(() => {
    if (!Array.isArray(rawMods)) setMods([]);
  }, [rawMods, setMods]);

  useEffect(() => {
    if (!Array.isArray(rawRecordedEvents)) setRecordedEvents([]);
  }, [rawRecordedEvents, setRecordedEvents]);

  useEffect(() => {
    if (!Array.isArray(rawMacroEvents)) setMacroEvents([]);
  }, [rawMacroEvents, setMacroEvents]);

  useEffect(() => {
    if (!Array.isArray(rawScriptMatchPatterns)) setScriptMatchPatterns(['*']);
  }, [rawScriptMatchPatterns, setScriptMatchPatterns]);

  // Auto-migrate legacy Groq key stored in grok variable to groq provider
  useEffect(() => {
    if (apiKeys && apiKeys.grok && apiKeys.grok.startsWith('gsk_')) {
      const updatedKeys = { ...apiKeys };
      if (!updatedKeys.groq) {
        updatedKeys.groq = apiKeys.grok;
      }
      updatedKeys.grok = '';
      setApiKeys(updatedKeys);
      
      if (llmProvider === 'grok') {
        setLlmProvider('groq');
      }
    }
  }, [apiKeys, llmProvider, setApiKeys, setLlmProvider]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) setActiveDomain(new URL(tabs[0].url).hostname.replace(/^www\./, ''));
      });
    }
  }, []);

  const showNotification = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getActiveTabDom = async () => {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        resolve(null);
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          resolve(null);
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_DOM_STRUCTURE' }, (res) => {
          if (chrome.runtime.lastError || !res || res.status !== 'success') {
            resolve(null);
          } else {
            resolve(res.structure);
          }
        });
      });
    });
  };

  const handleActivateGrabber = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ elementPickerActive: true }, () => {
        showNotification("Element Grabber active! Select an element on the page.", "info");
        setTimeout(() => window.close(), 1000);
      });
    } else {
      showNotification("Element Grabber requires Chrome Extension context.", "error");
    }
  };

  const handleCompile = async () => {
    if (!promptText.trim()) return showNotification("Please enter a prompt.", "error");
    setIsCompiling(true);
    
    let domStructure = null;
    if (attachDomOnCompile) {
      try {
        domStructure = await getActiveTabDom();
      } catch (e) {
        console.warn("Could not retrieve active tab DOM structure:", e);
      }
    }
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: 'COMPILE_PROMPT', 
        payload: { 
          prompt: promptText,
          domStructure: domStructure,
          targetElements: safeGrabbedElements
        } 
      }, (aiRes) => {
        setIsCompiling(false);
        if (chrome.runtime.lastError) {
          showNotification("Failed to contact background compiler.", "error");
          return;
        }
        if (aiRes && aiRes.status === 'success') {
          setPendingMod({
            type: aiRes.type,
            code: aiRes.code,
            prompt: promptText
          });
          setGrabbedElements([]);
          showNotification("Mod compiled successfully! Please review the script.", "info");
        } else {
          showNotification(aiRes?.message || "AI Compilation failed.", "error");
        }
      });
    } else {
      setTimeout(() => { 
        setIsCompiling(false); 
        setPendingMod({
          type: 'JS',
          code: '// Mock compile code output\nconsole.log("Mock Mod Executed");',
          prompt: promptText
        });
        showNotification("Mock compile complete. Please review the script.", "info"); 
      }, 1000);
    }
  };

  const handleModifyScript = async () => {
    if (!modifyPrompt.trim()) return showNotification("Please enter modification instructions.", "error");
    if (!scriptCode.trim()) return showNotification("Script is empty.", "error");
    
    setIsModifying(true);
    let domStructure = null;
    if (attachDomOnModify) {
      try {
        domStructure = await getActiveTabDom();
      } catch (e) {
        console.warn("Could not retrieve active tab DOM structure:", e);
      }
    }
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: 'MODIFY_SCRIPT_PROMPT', 
        payload: { 
          prompt: modifyPrompt,
          existingScript: scriptCode,
          domStructure: domStructure,
          targetElements: safeGrabbedElements
        } 
      }, (aiRes) => {
        setIsModifying(false);
        if (chrome.runtime.lastError) {
          showNotification("Failed to contact background compiler.", "error");
          return;
        }
        if (aiRes && aiRes.status === 'success') {
          handleScriptCodeChange(aiRes.code);
          setGrabbedElements([]);
          showNotification("Script modified successfully! Review changes before saving.", "info");
        } else {
          showNotification(aiRes?.message || "AI Modification failed.", "error");
        }
      });
    } else {
      setTimeout(() => { 
        setIsModifying(false); 
        handleScriptCodeChange(`// Modified Code\n${scriptCode}`);
        showNotification("Mock modification complete.", "info"); 
      }, 1000);
    }
  };

  const handleAcceptMod = () => {
    if (!pendingMod) return;

    const modSnapshot = { ...pendingMod };

    const newMod = {
      id: Date.now().toString(),
      title: modSnapshot.prompt.substring(0, 30) || 'AI Generated Mod',
      type: modSnapshot.type,
      code: modSnapshot.code,
      active: true,
      domain: activeDomain,
      matchPattern: '*://' + activeDomain + '/*'
    };

    // Use functional updater so we always append to the latest mods array,
    // not a stale snapshot captured at render time.
    setMods(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, newMod];
    });

    // Clear review state
    setPendingMod(null);
    setPromptText('');

    showNotification(`✅ Saved ${modSnapshot.type} Mod to Vault! Reload the page to apply it.`);
    // Note: We intentionally do NOT call EXECUTE_COMPILED_SCRIPT here.
    // Injecting a full Tampermonkey UserScript into a live SPA tab can freeze Chrome.
    // content.js already reads mods from chrome.storage on page load and injects them automatically.
  };

  const handleDenyMod = () => {
    setPendingMod(null);
    showNotification("Mod compilation discarded.", "info");
  };


  const toggleRecording = () => {
    const newState = !isRecording;
    if (newState) {
      setRecordedEvents([]); // Clear old events when starting fresh
      showNotification("Recording! You can close this popup and interact.", "info");
    }
    setIsRecording(newState); // Triggers storage update, which content.js hears immediately!
  };


  const runMod = (mod) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      if (mod.type === 'Macro') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'PLAY_MACRO', payload: { events: mod.events } })
              .catch(err => {
                console.warn("Could not play macro on this page:", err);
                showNotification("Macro cannot be played on this page.", "error");
              });
          }
        });
      } else {
        chrome.runtime.sendMessage({ action: 'EXECUTE_MOD', payload: mod })
          .catch(err => {
            console.warn("Could not execute script:", err);
          });
      }
    }
  };

  const stopMacroPlayback = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_MACRO' })
            .then(() => {
              showNotification("Macro stopped");
            })
            .catch(err => {
              console.warn("Could not stop macro on this page:", err);
            });
        }
      });
    }
  };

  const handleScriptCodeChange = (code) => {
    setScriptCode(code);
    
    // Parse UserScript headers if present
    const headerMatch = code.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
    if (headerMatch) {
      const lines = headerMatch[1].split('\n');
      let parsedName = '';
      let parsedMatches = [];
      
      for (let line of lines) {
        const match = line.match(/\/\/\s*@(\w+)\s+(.*)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (key === 'name') {
            parsedName = value;
          } else if (key === 'match' || key === 'include') {
            parsedMatches.push(value);
          }
        }
      }
      
      if (parsedName) {
        setScriptName(parsedName);
      }
      if (parsedMatches.length > 0) {
        setScriptMatchPatterns(parsedMatches);
        setSelectedMatchIdx(0);
      }
      setScriptType('JS');
      showNotification("✨ Parsed Tampermonkey headers!", "success");
    }
  };

  const handleKeybindingKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const key = e.key;
    
    if ((key === 'Backspace' || key === 'Delete') && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      setScriptKeybinding('');
      return;
    }
    
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return;
    }
    
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Meta');
    
    let primaryKey = key;
    if (primaryKey === ' ') primaryKey = 'Space';
    else if (primaryKey.length === 1) primaryKey = primaryKey.toUpperCase();
    
    keys.push(primaryKey);
    
    const binding = keys.slice(0, 4).join('+');
    setScriptKeybinding(binding);
  };

  const saveCustomScript = () => {
    if (!scriptName.trim()) return showNotification("Please enter a script name.", "error");
    if (scriptType !== 'Macro' && !scriptCode.trim()) return showNotification("Please enter script code.", "error");
    
    const cleanPatterns = scriptMatchPatterns.map(p => p.trim()).filter(p => p !== '');
    const finalPatterns = cleanPatterns.length > 0 ? cleanPatterns : ['*'];
    
    if (editingScriptId) {
      // Editing existing mod
      setMods(mods.map(m => m.id === editingScriptId ? {
        ...m,
        title: scriptName.trim(),
        type: scriptType,
        matchPatterns: scriptType === 'Macro' ? undefined : finalPatterns,
        matchPattern: scriptType === 'Macro' ? undefined : finalPatterns[0],
        code: scriptType === 'Macro' ? undefined : scriptCode,
        events: scriptType === 'Macro' ? macroEvents : undefined,
        keybinding: scriptKeybinding.trim() || undefined
      } : m));
      showNotification("Script updated successfully!");
    } else {
      // Adding new mod
      const newMod = {
        id: Date.now(),
        title: scriptName.trim(),
        type: scriptType,
        matchPatterns: scriptType === 'Macro' ? undefined : finalPatterns,
        matchPattern: scriptType === 'Macro' ? undefined : finalPatterns[0],
        code: scriptType === 'Macro' ? undefined : scriptCode,
        events: scriptType === 'Macro' ? macroEvents : [],
        keybinding: scriptKeybinding.trim() || undefined,
        active: true
      };
      setMods([...mods, newMod]);
      showNotification("Script added to Vault!");
    }
    
    // Clear and close
    setShowAddScript(false);
    setScriptName('');
    setScriptMatchPatterns(['*']);
    setSelectedMatchIdx(0);
    setScriptType('JS');
    setScriptCode('');
    setScriptKeybinding('');
    setMacroEvents([]);
    setEditingScriptId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans shadow-2xl relative select-none">
      
      {/* Toast */}
      {toast && (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl text-xs font-medium border backdrop-blur-md transition-all ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'}`}>
          {toast.type === 'error' ? <AlertTriangleIcon /> : <PlayIcon className="w-3 h-3" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700/50 flex items-center justify-center"><span className="font-mono text-[10px] text-zinc-300">{'</>'}</span></div>
          <div className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-400 flex items-center gap-1">
            <CloudIcon className="w-3 h-3" /> 
            {llmProvider === 'grok' ? 'Grok API' : llmProvider === 'groq' ? 'Groq API' : llmProvider === 'anthropic' ? 'Claude API' : 'OpenAI API'}
          </div>
        </div>
        <div className="font-mono text-[11px] text-zinc-400">{activeDomain}</div>
      </header>

      {/* Nav */}
      <nav className="flex border-b border-zinc-800/80 bg-zinc-950">
        {['studio', 'vault', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-[11px] font-medium capitalize ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tab}
          </button>
        ))}
      </nav>

      {/* Main Context */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">
        
        {/* Studio Tab (Merged AI Compiler & Macro Recorder) */}
        {activeTab === 'studio' && (
          <div className="flex flex-col h-full gap-3">
            {/* AI Mod Compiler section */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-zinc-800/50">
                <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <CrosshairIcon className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  AI Mod Compiler
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Active Domain: {activeDomain}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <textarea 
                  value={promptText} 
                  onChange={e => setPromptText(e.target.value)} 
                  placeholder="e.g. 'Extract pricing to CSV' or 'Make background dark'" 
                  className="w-full h-[60px] bg-zinc-950 border border-zinc-800 focus:border-blue-500 outline-none text-xs text-zinc-200 p-2.5 rounded-md resize-none font-mono" 
                />
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={handleActivateGrabber}
                    className="text-[10px] font-medium text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
                  >
                    <CrosshairIcon className="w-3 h-3" /> Select Elements
                  </button>
                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={attachDomOnCompile} 
                      onChange={e => setAttachDomOnCompile(e.target.checked)}
                      className="accent-blue-500 w-3 h-3 cursor-pointer"
                    />
                    Attach Active DOM
                  </label>
                </div>
              </div>
              
              {safeGrabbedElements.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-[-2px]">
                  {safeGrabbedElements.map((el, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-1.5">
                      <span className="text-[10px] text-indigo-300 font-mono truncate flex-1">
                        🧲 Targeted: {el.selector || el.tag} {el.selectAll ? '(All)' : ''}
                      </span>
                      <button 
                        onClick={() => {
                          const newArr = [...safeGrabbedElements];
                          newArr.splice(idx, 1);
                          setGrabbedElements(newArr);
                        }}
                        className="text-indigo-400 hover:text-indigo-200"
                      >
                        <CrosshairIcon className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={handleCompile} 
                disabled={isCompiling} 
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isCompiling ? <><LoaderIcon className="animate-spin w-3 h-3" /> Compiling...</> : 'Compile Mod'}
              </button>
            </div>


            {pendingMod && (
              <div className="flex-1 flex flex-col gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-3.5">
                {/* Header — matches Vault edit section header */}
                <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2">
                  <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Review Compiled Mod
                  </h3>
                  <button onClick={handleDenyMod} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">Discard</button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Prompt — same as Script Name input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-400">Prompt</label>
                    <input
                      type="text"
                      value={pendingMod.prompt}
                      readOnly
                      className="bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-md font-sans text-zinc-300 select-text cursor-default"
                    />
                  </div>

                  {/* Type badge row — matches the Type/Key Binding row layout */}
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-semibold text-zinc-400">Type</label>
                      <div className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1.5 rounded-md text-zinc-300 flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          pendingMod.type === 'JS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>{pendingMod.type}</span>
                        <span className="text-zinc-400">{pendingMod.type === 'JS' ? 'JavaScript' : 'CSS'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-semibold text-zinc-400">Target Domain</label>
                      <input
                        type="text"
                        value={activeDomain}
                        readOnly
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-md font-mono text-zinc-400 select-text cursor-default"
                      />
                    </div>
                  </div>

                  {/* Code textarea — identical styling to Code / UserScript textarea in Vault */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-400 flex justify-between">
                      <span>Generated Code</span>
                      <span className="text-[9px] text-zinc-500 font-normal italic">Read-only preview</span>
                    </label>
                    <textarea
                      value={pendingMod.code}
                      readOnly
                      className="min-h-[140px] max-h-[180px] bg-zinc-950 border border-zinc-800 text-[10px] p-2.5 rounded-md font-mono resize-y text-zinc-200 select-text"
                    />
                  </div>

                  {/* Accept button — full-width blue, matches Update Script button */}
                  <button
                    onClick={handleAcceptMod}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors mt-1 cursor-pointer"
                  >
                    Accept &amp; Save to Vault
                  </button>
                </div>
              </div>
            )}



            {/* Macro Recorder section */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <RecordIcon className={isRecording ? 'text-red-400 animate-pulse' : 'text-zinc-400'} />
                  Macro Builder
                </span>
                <button 
                  onClick={toggleRecording} 
                  className={`text-[9px] px-2.5 py-1 rounded font-semibold border transition-colors cursor-pointer ${
                    isRecording 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                      : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
              
              {isRecording && (
                <p className="text-[9px] text-zinc-400 italic bg-zinc-950/30 border border-zinc-800/50 px-2.5 py-1.5 rounded mt-1">
                  💡 Recording active! You can close this popup and interact with the page. Use the floating control widget at the bottom right of the page to view steps and save your macro.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Vault Tab */}
        {activeTab === 'vault' && (
          <div className="flex flex-col gap-3 h-full">
            {/* Action Bar */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingScriptId(null);
                  setScriptName('');
                  setScriptMatchPatterns(activeDomain ? [`*://${activeDomain}/*`] : ['*']);
                  setSelectedMatchIdx(0);
                  setScriptType('JS');
                  setScriptCode('');
                  setScriptKeybinding('');
                  setShowAddScript(true);
                }} 
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>+</span> Add Custom Script
              </button>
              <button
                onClick={stopMacroPlayback}
                className="bg-red-950/30 hover:bg-red-900/30 border border-red-900/40 text-red-400 hover:text-red-350 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-red-950/20"
                title="Stop any running macro on active page"
              >
                <span className="w-1.5 h-1.5 rounded-sm bg-red-400 animate-pulse"></span>
                Stop Playing
              </button>
            </div>
            
            {showAddScript ? (
              /* Add/Edit Script Form */
              <div className="flex-1 flex flex-col gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-3.5">
                <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2">
                  <h3 className="text-xs font-bold text-zinc-300">
                    {editingScriptId ? 'Edit Custom Script' : 'Add Custom Script'}
                  </h3>
                  <button onClick={() => setShowAddScript(false)} className="text-[10px] text-zinc-500 hover:text-zinc-300">Cancel</button>
                </div>
                
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-400">Script Name</label>
                    <input 
                      type="text" 
                      value={scriptName} 
                      onChange={e => setScriptName(e.target.value)} 
                      placeholder="e.g. Highlight Buttons" 
                      className="bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-md focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-semibold text-zinc-400">Type</label>
                      <select 
                        value={scriptType} 
                        onChange={e => {
                          setScriptType(e.target.value);
                          if (e.target.value === 'Macro' && macroEvents.length === 0) {
                            setMacroEvents([]);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1.5 rounded-md focus:outline-none focus:border-blue-500 text-zinc-300"
                      >
                        <option value="JS">JavaScript</option>
                        <option value="CSS">CSS</option>
                        <option value="Macro">Macro</option>
                      </select>
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-[10px] font-semibold text-zinc-400 flex justify-between">
                        <span>Key Binding</span>
                        {scriptKeybinding && (
                          <button 
                            type="button"
                            onClick={() => setScriptKeybinding('')}
                            className="text-[9px] text-red-400 hover:text-red-300 font-medium"
                          >
                            Clear
                          </button>
                        )}
                      </label>
                      <input 
                        type="text" 
                        value={scriptKeybinding} 
                        onKeyDown={handleKeybindingKeyDown}
                        placeholder="Press keys (max 4)" 
                        readOnly
                        className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-md focus:outline-none focus:border-blue-500 font-mono text-blue-400 cursor-pointer text-center"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-400 flex justify-between">
                      <span>URL Match Patterns</span>
                      {scriptType !== 'Macro' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const newPats = [...scriptMatchPatterns, '*'];
                              setScriptMatchPatterns(newPats);
                              setSelectedMatchIdx(newPats.length - 1);
                            }}
                            className="text-[9px] text-blue-400 hover:text-blue-300 font-medium"
                          >
                            + Add
                          </button>
                          {scriptMatchPatterns.length > 1 && (
                            <button 
                              onClick={() => {
                                const newPats = scriptMatchPatterns.filter((_, i) => i !== selectedMatchIdx);
                                setScriptMatchPatterns(newPats);
                                setSelectedMatchIdx(0);
                              }}
                              className="text-[9px] text-red-400 hover:text-red-300 font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </label>
                    
                    {scriptType === 'Macro' ? (
                      <input 
                        type="text" 
                        value="N/A (Matches everywhere)" 
                        disabled 
                        className="bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded-md text-zinc-500 disabled:opacity-50"
                      />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select 
                          value={selectedMatchIdx} 
                          onChange={e => setSelectedMatchIdx(parseInt(e.target.value))}
                          className="bg-zinc-950 border border-zinc-800 text-[10px] px-2 py-1 rounded-md focus:outline-none focus:border-blue-500 text-zinc-300 font-mono"
                        >
                          {scriptMatchPatterns.map((pat, idx) => (
                            <option key={idx} value={idx}>
                              [{idx + 1}/{scriptMatchPatterns.length}] {pat}
                            </option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          value={scriptMatchPatterns[selectedMatchIdx] || ''} 
                          onChange={e => {
                            const newPats = [...scriptMatchPatterns];
                            newPats[selectedMatchIdx] = e.target.value;
                            setScriptMatchPatterns(newPats);
                          }} 
                          placeholder="e.g. *://*.google.com/*" 
                          className="bg-zinc-950 border border-zinc-800 text-[10px] px-2.5 py-1.5 rounded-md focus:outline-none focus:border-blue-500 font-mono text-zinc-200"
                        />
                      </div>
                    )}
                  </div>
                  
                  {scriptType === 'Macro' ? (
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
                      <div className="flex justify-between items-center pb-1 border-b border-zinc-800/60">
                        <span className="text-[10px] font-semibold text-zinc-400">Macro Steps</span>
                        <button 
                          onClick={() => setMacroEvents([...macroEvents, { type: 'click', target: '', value: '', time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) }])}
                          className="text-[9px] text-blue-400 hover:text-blue-300 font-medium"
                        >
                          + Add Step
                        </button>
                      </div>
                      {macroEvents.length === 0 ? (
                        <div className="text-zinc-600 text-center text-[10px] py-4 italic">No steps in this macro.</div>
                      ) : (
                        macroEvents.map((evt, idx) => (
                          <div key={idx} className="bg-zinc-950 border border-zinc-800 p-2 rounded-md flex flex-col gap-1.5 relative">
                            <button 
                              onClick={() => setMacroEvents(macroEvents.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1.5 text-zinc-600 hover:text-red-400 text-[11px] font-bold"
                              title="Remove step"
                            >
                              ×
                            </button>
                            
                            <div className="flex gap-2 items-center">
                              <span className="text-[9px] font-bold text-zinc-500">#{idx + 1}</span>
                              <select 
                                value={evt.type} 
                                onChange={(e) => {
                                  const newEvts = [...macroEvents];
                                  newEvts[idx].type = e.target.value;
                                  setMacroEvents(newEvts);
                                }}
                                className="bg-zinc-900 border border-zinc-800 text-[9px] px-1 py-0.5 rounded text-zinc-300 outline-none"
                              >
                                <option value="click">click</option>
                                <option value="type">type</option>
                                <option value="keypress">keypress</option>
                                <option value="keyhold">keyhold</option>
                              </select>
                              
                              {evt.type === 'keypress' && (
                                <input 
                                  type="text"
                                  value={evt.key || 'Enter'}
                                  onChange={(e) => {
                                    const newEvts = [...macroEvents];
                                    newEvts[idx].key = e.target.value;
                                    setMacroEvents(newEvts);
                                  }}
                                  placeholder="Key..."
                                  className="bg-zinc-900 border border-zinc-800 text-[9px] px-1.5 py-0.5 rounded text-zinc-300 font-mono outline-none w-[60px]"
                                  title="Keyboard key to press"
                                />
                              )}

                              {evt.type === 'keyhold' && (
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="text"
                                    value={evt.key || 'ArrowDown'}
                                    onChange={(e) => {
                                      const newEvts = [...macroEvents];
                                      newEvts[idx].key = e.target.value;
                                      setMacroEvents(newEvts);
                                    }}
                                    placeholder="Key..."
                                    className="bg-zinc-900 border border-zinc-800 text-[9px] px-1.5 py-0.5 rounded text-zinc-300 font-mono outline-none w-[60px]"
                                    title="Keyboard key to hold down"
                                  />
                                  <span className="text-[8px] text-zinc-500">Hold:</span>
                                  <input 
                                    type="text"
                                    value={evt.duration || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '');
                                      const newEvts = [...macroEvents];
                                      newEvts[idx].duration = val === '' ? undefined : parseInt(val, 10);
                                      setMacroEvents(newEvts);
                                    }}
                                    placeholder="ms"
                                    className="bg-zinc-900 border border-zinc-800 text-[9px] px-1 py-0.5 rounded text-zinc-300 font-mono outline-none w-[36px]"
                                    title="Holding duration in milliseconds"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[8px] text-zinc-500">Delay:</span>
                                <input 
                                  type="text"
                                  value={evt.delay || ''}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const newEvts = [...macroEvents];
                                    newEvts[idx].delay = val === '' ? undefined : parseInt(val, 10);
                                    setMacroEvents(newEvts);
                                  }}
                                  placeholder="Default"
                                  className="bg-zinc-900 border border-zinc-800 text-[9px] px-1 py-0.5 rounded text-zinc-300 font-mono outline-none w-[52px]"
                                />
                                <span className="text-[8px] text-zinc-500">ms</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-1.5 w-full">
                              <input 
                                type="text" 
                                value={evt.target} 
                                onChange={(e) => {
                                  const newEvts = [...macroEvents];
                                  newEvts[idx].target = e.target.value;
                                  setMacroEvents(newEvts);
                                }}
                                placeholder="CSS Selector (e.g. button.submit)"
                                className="flex-1 bg-zinc-900 border border-zinc-800 text-[9px] px-2 py-1 rounded focus:outline-none focus:border-blue-500 font-mono text-zinc-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof chrome !== 'undefined' && chrome.storage) {
                                    chrome.storage.local.set({
                                      healingInfo: {
                                        modId: editingScriptId,
                                        stepIdx: idx
                                      }
                                    }, () => {
                                      showNotification("Healing Mode active! Click an element on the page.", "success");
                                      window.close();
                                    });
                                  }
                                }}
                                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                title="Target and select new element from active webpage"
                              >
                                🎯 Heal
                              </button>
                            </div>
                            
                            {evt.type === 'type' && (
                              <input 
                                type="text" 
                                value={evt.value || ''} 
                                onChange={(e) => {
                                  const newEvts = [...macroEvents];
                                  newEvts[idx].value = e.target.value;
                                  setMacroEvents(newEvts);
                                }}
                                placeholder="Text value to enter"
                                className="w-full bg-zinc-900 border border-zinc-800 text-[9px] px-2 py-1 rounded focus:outline-none focus:border-blue-500 text-zinc-300"
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {/* AI ASSIST PANEL */}
                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-md p-2 mb-2 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
                            ✨ AI Assist
                          </span>
                          <label className="flex items-center gap-1.5 text-[9px] text-zinc-400 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={attachDomOnModify} 
                              onChange={e => setAttachDomOnModify(e.target.checked)}
                              className="accent-blue-500 w-3 h-3 cursor-pointer"
                            />
                            Attach DOM
                          </label>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <textarea 
                            value={modifyPrompt} 
                            onChange={e => setModifyPrompt(e.target.value)} 
                            placeholder="e.g. 'Add a delay before clicking' or 'Fix the selector'" 
                            className="w-full h-[40px] bg-zinc-950 border border-zinc-800 focus:border-blue-500 outline-none text-[10px] text-zinc-200 p-2 rounded resize-none font-mono" 
                          />
                          <div className="flex justify-between items-center px-1">
                            <button
                              onClick={handleActivateGrabber}
                              className="text-[10px] font-medium text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
                            >
                              <CrosshairIcon className="w-3 h-3" /> Select Elements
                            </button>
                          </div>
                        </div>
                        {safeGrabbedElements.length > 0 && (
                          <div className="flex flex-col gap-1 mt-[-2px]">
                            {safeGrabbedElements.map((el, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded px-1.5 py-1">
                                <span className="text-[9px] text-indigo-300 font-mono truncate flex-1">
                                  🧲 {el.selector || el.tag} {el.selectAll ? '(All)' : ''}
                                </span>
                                <button 
                                  onClick={() => {
                                    const newArr = [...safeGrabbedElements];
                                    newArr.splice(idx, 1);
                                    setGrabbedElements(newArr);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-200"
                                >
                                  <CrosshairIcon className="w-2.5 h-2.5 rotate-45" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={handleModifyScript} 
                          disabled={isModifying || !modifyPrompt.trim()} 
                          className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 disabled:opacity-50 text-[10px] font-medium py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                          {isModifying ? <><LoaderIcon className="animate-spin w-3 h-3" /> Modifying...</> : 'Apply AI Modification'}
                        </button>
                      </div>

                      <label className="text-[10px] font-semibold text-zinc-400 flex justify-between">
                        <span>Code / UserScript</span>
                        <span className="text-[9px] text-zinc-500 font-normal italic">Parses metadata headers automatically</span>
                      </label>
                      <textarea 
                        value={scriptCode} 
                        onChange={e => handleScriptCodeChange(e.target.value)} 
                        placeholder={scriptType === 'JS' ? "// Paste JS or Tampermonkey script here...\n(function() {\n  console.log('Hello!');\n})();" : "/* Paste CSS here */\nbody {\n  border: 2px solid red !important;\n}"} 
                        className="min-h-[140px] max-h-[180px] bg-zinc-950 border border-zinc-800 text-[10px] p-2.5 rounded-md focus:outline-none focus:border-blue-500 font-mono resize-y text-zinc-200"
                      />
                    </div>
                  )}
                  
                  <button 
                    onClick={saveCustomScript} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors mt-1"
                  >
                    {editingScriptId ? 'Update Script' : 'Save Script'}
                  </button>
                </div>
              </div>
            ) : (
              /* Mods list */
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                {mods.length === 0 ? (
                  <div className="text-zinc-500 text-center text-xs mt-10">Vault is empty.</div>
                ) : (
                  mods.map(mod => (
                    <div key={mod.id} className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 flex flex-col gap-2 group transition-all hover:border-zinc-700">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2 max-w-[80%]">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            mod.type === 'JS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            mod.type === 'CSS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {mod.type}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xs font-medium text-zinc-200 truncate">{mod.title}</h3>
                              {mod.keybinding && (
                                <span className="text-[8px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded" title={`Keybinding: ${mod.keybinding}`}>
                                  {mod.keybinding}
                                </span>
                              )}
                            </div>
                            {mod.matchPatterns && mod.matchPatterns.length > 0 ? (
                               <span className="text-[9px] text-zinc-500 truncate font-mono mt-0.5" title={mod.matchPatterns.join(', ')}>
                                 Match: {mod.matchPatterns[0]} {mod.matchPatterns.length > 1 ? `(+${mod.matchPatterns.length - 1} more)` : ''}
                               </span>
                             ) : mod.matchPattern ? (
                               <span className="text-[9px] text-zinc-500 truncate font-mono mt-0.5">
                                 Match: {mod.matchPattern}
                               </span>
                             ) : null}
                          </div>
                        </div>
                        <ToggleSwitch 
                          checked={mod.active} 
                          onChange={() => setMods(mods.map(m => m.id === mod.id ? {...m, active: !m.active} : m))} 
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-zinc-800/40">
                        <button 
                          onClick={() => {
                            setEditingScriptId(mod.id);
                            setScriptName(mod.title);
                            setScriptMatchPatterns(mod.matchPatterns || [mod.matchPattern || '*']);
                            setSelectedMatchIdx(0);
                            setScriptType(mod.type);
                            setScriptKeybinding(mod.keybinding || '');
                            if (mod.type === 'Macro') {
                              setMacroEvents(mod.events || []);
                            } else {
                              setScriptCode(mod.code || '');
                            }
                            setShowAddScript(true);
                          }} 
                          className="text-zinc-500 hover:text-blue-400 text-[10px] font-medium flex items-center gap-1"
                          title="Edit script"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => runMod(mod)} 
                          className="text-zinc-500 hover:text-emerald-400 text-[10px] font-medium flex items-center gap-1"
                          title="Run/Play"
                        >
                          Run
                        </button>
                        <button 
                          onClick={() => setMods(mods.filter(m => m.id !== mod.id))} 
                          className="text-zinc-500 hover:text-red-400 text-[10px] font-medium flex items-center gap-1"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5 space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Active LLM Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 text-zinc-300 cursor-pointer"
              >
                <option value="groq">Groq (Llama 3.3)</option>
                <option value="grok">xAI Grok (Grok 2)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              </select>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5 space-y-3">
              {llmProvider === 'openai' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">OpenAI API Key</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={apiKeys?.openai || ''} 
                      onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})} 
                      placeholder="sk-..." 
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono pr-8 text-zinc-300" 
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">{showApiKey ? <EyeOffIcon className="w-3.5 h-3.5"/> : <EyeIcon className="w-3.5 h-3.5"/>}</button>
                  </div>
                </div>
              )}

              {llmProvider === 'anthropic' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Anthropic Claude API Key</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={apiKeys?.anthropic || ''} 
                      onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})} 
                      placeholder="sk-ant-..." 
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono pr-8 text-zinc-300" 
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">{showApiKey ? <EyeOffIcon className="w-3.5 h-3.5"/> : <EyeIcon className="w-3.5 h-3.5"/>}</button>
                  </div>
                </div>
              )}

              {llmProvider === 'groq' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Groq API Key</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={apiKeys?.groq || ''} 
                      onChange={(e) => setApiKeys({...apiKeys, groq: e.target.value})} 
                      placeholder="gsk_..." 
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono pr-8 text-zinc-300" 
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">{showApiKey ? <EyeOffIcon className="w-3.5 h-3.5"/> : <EyeIcon className="w-3.5 h-3.5"/>}</button>
                  </div>
                </div>
              )}

              {llmProvider === 'grok' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">xAI Grok API Key</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={apiKeys?.grok || ''} 
                      onChange={(e) => setApiKeys({...apiKeys, grok: e.target.value})} 
                      placeholder="xai-..." 
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono pr-8 text-zinc-300" 
                    />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">{showApiKey ? <EyeOffIcon className="w-3.5 h-3.5"/> : <EyeIcon className="w-3.5 h-3.5"/>}</button>
                  </div>
                </div>
              )}
              <p className="text-[9px] text-zinc-500">Keys are stored locally in chrome.storage.</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5 space-y-3">
              <label className="text-xs font-semibold text-zinc-300">Playback Step Delay (ms)</label>
              <input 
                type="text" 
                value={playbackDelay} 
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPlaybackDelay(val);
                }}
                onBlur={() => {
                  if (playbackDelay === '') {
                    setPlaybackDelay(1000);
                  } else {
                    const parsed = parseInt(playbackDelay, 10);
                    if (isNaN(parsed) || parsed < 100) {
                      setPlaybackDelay(100);
                    } else {
                      setPlaybackDelay(parsed);
                    }
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono text-zinc-300"
              />
              <p className="text-[9px] text-zinc-500">Delay between macro steps in milliseconds (default: 1000).</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5 space-y-3">
              <label className="text-xs font-semibold text-zinc-300">AI Compilation Max Retries</label>
              <input 
                type="text" 
                value={maxRetries} 
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setMaxRetries(val ? parseInt(val) : 0);
                }}
                onBlur={() => {
                  const parsed = parseInt(maxRetries);
                  if (isNaN(parsed) || parsed < 1) {
                    setMaxRetries(1);
                  } else if (parsed > 10) {
                    setMaxRetries(10);
                  } else {
                    setMaxRetries(parsed);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-2 rounded-md focus:outline-none focus:border-blue-500 font-mono text-zinc-300"
              />
              <p className="text-[9px] text-zinc-500">Maximum times the AI compiler will retry fixing syntax/runtime errors (default: 3, max: 10).</p>
            </div>

            <button onClick={() => { setMods([]); setApiKeys({ openai: '', anthropic: '', grok: '', groq: '', gemini: '' }); setLlmProvider('groq'); setRecordedEvents([]); chrome.storage.local.clear(); }} className="mt-auto text-xs font-medium text-red-400 border border-red-500/20 py-2.5 rounded-lg flex justify-center items-center gap-2 cursor-pointer hover:bg-red-500/5 transition-colors"><TrashIcon className="w-3.5 h-3.5" /> Clear Data</button>
          </div>
        )}

      </main>
    </div>
  );
}