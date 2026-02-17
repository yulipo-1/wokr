// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveQuestion') {
    solveQuestion(request.question, request.options, request.apiKey)
      .then(answer => sendResponse({ answer }))
      .catch(error => {
        console.error('Background script error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

// Call OpenRouter API to solve the question
async function solveQuestion(questionText, options, apiKey) {
  console.log('[Background] Solving question:', questionText);
  console.log('[Background] Options:', options);

  // Construct the prompt for the AI
  const prompt = `Question: ${questionText}\n\nOptions:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n\nPlease provide ONLY the exact text of the correct answer option (not the letter, just the text).`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Test Site AI Solver'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers multiple choice questions. Return only the exact text of the correct answer option.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from API');
    }

    const answer = data.choices[0].message.content.trim();
    console.log('[Background] AI Answer:', answer);
    
    return answer;
  } catch (error) {
    console.error('[Background] API Error:', error);
    throw error;
  }
}