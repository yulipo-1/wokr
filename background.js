// Background service worker for Blackboard Ultra AI Solver
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveQuestion') {
    handleApiRequest(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('[Background] Error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

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

async function handleApiRequest({ questionText, answerOptions, apiKey }) {
  const sanitizedKey = normalizeApiKey(apiKey);

  if (!sanitizedKey) {
    throw new Error('API key not configured. Please save your API key in the popup.');
  }
  
  if (!isLikelyOpenRouterKey(sanitizedKey)) {
    throw new Error('Invalid API key format. Expected OpenRouter key (sk-or-...)');
  }

  console.log('[Background] Processing question:', questionText);
  console.log('[Background] Answer options:', answerOptions);

  // Construct the prompt
  const systemPrompt = 'You are a specialized exam solver. I will provide a question and a list of answer options. You must reply with EXACTLY and ONLY the text of the correct answer option. Do not explain. Do not use Markdown.';
  
  const userPrompt = `Question: ${questionText}\n\nOptions:\n${answerOptions.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}`;

  console.log('[Background] Sending request to OpenRouter API...');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sanitizedKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://online.epcc.edu',
        'X-Title': 'Blackboard Ultra AI Solver'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      let errorMessage = `API Error ${response.status}`;
      try {
        const errData = await response.json();
        errorMessage = errData.error?.message || errorMessage;
      } catch (e) {
        const text = await response.text();
        errorMessage = text || errorMessage;
      }

      if (response.status === 401) {
        throw new Error('Invalid API Key - verify on openrouter.ai');
      }
      if (response.status === 429) {
        throw new Error('Rate limited - too many requests, wait a moment');
      }
      if (response.status === 402) {
        throw new Error('Out of credits - add credits to OpenRouter');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[Background] Invalid response structure:', data);
      throw new Error('Invalid response from AI');
    }

    const answerText = data.choices[0].message.content.trim();
    console.log('[Background] AI response:', answerText);

    return { answer: answerText };

  } catch (error) {
    console.error('[Background] Request error:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error - check internet connection');
    }
    throw error;
  }
}