document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const startBtn = document.getElementById('startBtn');
  const statusDiv = document.getElementById('status');

  function normalizeApiKey(raw) {
    if (!raw) return '';
    return String(raw)
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, '');
  }

  function isLikelyOpenRouterKey(key) {
    return /^sk-or-(?:v\d+-)?[A-Za-z0-9._-]{16,}$/.test(key);
  }

  // Load existing key and enable start button if key exists
  chrome.storage.local.get(['openRouterKey'], (result) => {
    if (result.openRouterKey) {
      apiKeyInput.value = result.openRouterKey;
      startBtn.disabled = false;
    }
  });

  // Save API key
  saveBtn.addEventListener('click', async () => {
    const key = normalizeApiKey(apiKeyInput.value);
    apiKeyInput.value = key;
    
    if (!key) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!isLikelyOpenRouterKey(key)) {
      showStatus('Invalid key format. Expected OpenRouter key (sk-or-...)', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ openRouterKey: key });
      showStatus('✓ API Key saved successfully!', 'success');
      startBtn.disabled = false;
      setTimeout(() => {
        statusDiv.className = 'status';
      }, 2000);
    } catch (e) {
      showStatus('Failed to save: ' + e.message, 'error');
    }
  });

  // Start automation
  startBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Validate that we're on a Blackboard Ultra test page
      // Check that the URL hostname matches expected domain
      const url = new URL(tab.url);
      if (url.hostname !== 'online.epcc.edu') {
        showStatus('Please navigate to a Blackboard Ultra test page first', 'error');
        return;
      }

      // Send message to content script to start automation
      chrome.tabs.sendMessage(tab.id, { action: 'startAutomation' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.success) {
          showStatus('✓ Automation started!', 'success');
          setTimeout(() => window.close(), 1500);
        } else {
          showStatus('Failed to start automation', 'error');
        }
      });
    } catch (e) {
      showStatus('Error: ' + e.message, 'error');
    }
  });

  function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = 'status show ' + type;
  }
});