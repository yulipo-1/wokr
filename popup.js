document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleBtn = document.getElementById('toggleBtn');
  const saveBtn = document.getElementById('saveBtn');
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

  // Load existing key
  chrome.storage.local.get(['openRouterKey'], (result) => {
    if (result.openRouterKey) {
      apiKeyInput.value = result.openRouterKey;
    }
  });

  // Toggle visibility
  toggleBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleBtn.textContent = apiKeyInput.type === 'password' ? '👁' : '🙈';
  });

  // Save
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
      setTimeout(() => window.close(), 1500);
    } catch (e) {
      showStatus('Failed to save: ' + e.message, 'error');
    }
  });

  function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = 'status show ' + type;
  }
});