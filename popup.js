document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleBtn = document.getElementById('toggleBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load existing key
  chrome.storage.sync.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  // Toggle visibility
  toggleBtn.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    toggleBtn.textContent = apiKeyInput.type === 'password' ? '👁' : '🙈';
  });

  // Save
  saveBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiKey: key });
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