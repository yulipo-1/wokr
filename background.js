chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveQuestions') {
    handleApiRequest(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Background script error:', error);
        sendResponse({ error: error.message });
      });
    return true;
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

function selectVerificationModel(primaryModel) {
  const highAccuracyCandidates = [
    'qwen/qwen-2.5-72b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'qwen/qwen-2.5-7b-instruct'
  ];

  return highAccuracyCandidates.find(m => m !== primaryModel) || primaryModel;
}

async function callOpenRouter({ model, apiKey, prompt, systemPrompt }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.05,
      max_tokens: 2500
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mheducation.com',
        'X-Title': 'SmartBook Solver'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch (e) {
        const text = await response.text();
        errData = { error: { message: text || `HTTP ${response.status}` } };
      }

      const message = errData.error?.message || `HTTP ${response.status}`;

      if (response.status === 401) throw new Error('Invalid API Key - verify on openrouter.ai');
      if (response.status === 429) throw new Error('Rate limited - too many requests, wait 30 seconds');
      if (response.status === 402) throw new Error('Out of credits - add credits to OpenRouter');
      if (response.status === 500) throw new Error('OpenRouter server error - try again or use different model');
      if (response.status === 400) throw new Error(`Bad request: ${message}`);

      throw new Error(message || `API Error ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleApiRequest({ content, model, apiKey }) {
  const sanitizedKey = normalizeApiKey(apiKey);

  if (!sanitizedKey) throw new Error('API key not configured');
  
  if (!isLikelyOpenRouterKey(sanitizedKey)) {
    throw new Error('Invalid API key format. Expected OpenRouter key (sk-or-...)');
  }

  const prompt = constructPrompt(content);
  const verifierModel = selectVerificationModel(model);
  
  console.log('[Background] Making API request to OpenRouter');
  console.log('[Background] Primary model:', model);
  console.log('[Background] Verifier model:', verifierModel);
  console.log('[Background] API Key valid:', sanitizedKey.substring(0, 20) + '...');
  
  try {
    const systemPrompt = 'You are an expert academic assistant. Return ONLY valid JSON (no markdown, no extra text) with exact match indices for all correct answers.';

    console.log('[Background] Running pass 1 (primary solve)...');
    const firstPassData = await callOpenRouter({
      model,
      apiKey: sanitizedKey,
      prompt,
      systemPrompt
    });

    if (!firstPassData.choices || !firstPassData.choices[0]) {
      console.error('[Background] No choices in first pass response:', firstPassData);
      throw new Error('Empty response from AI - model may not be available');
    }

    const firstPassParsed = parseAIResponse(firstPassData);

    console.log('[Background] Running pass 2 (verification/correction)...');
    const verificationPrompt = constructVerificationPrompt(content, firstPassParsed.answers);

    const secondPassData = await callOpenRouter({
      model: verifierModel,
      apiKey: sanitizedKey,
      prompt: verificationPrompt,
      systemPrompt
    });

    if (!secondPassData.choices || !secondPassData.choices[0]) {
      console.warn('[Background] Verifier returned empty response, using first pass result');
      return firstPassParsed;
    }

    const secondPassParsed = parseAIResponse(secondPassData);

    if (!secondPassParsed.answers || secondPassParsed.answers.length === 0) {
      console.warn('[Background] Verifier returned no answers, using first pass result');
      return firstPassParsed;
    }

    return secondPassParsed;

  } catch (error) {
    console.error('[Background] Request error:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out (60s) - network may be slow');
    }
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error - check internet connection or firewall');
    }
    throw error;
  }
}

function constructVerificationPrompt(content, firstPassAnswers) {
  let prompt = constructPrompt(content);
  prompt += `\n\nFIRST PASS ANSWERS TO VERIFY/CORRECT:\n`;
  prompt += JSON.stringify({ answers: firstPassAnswers }, null, 2);
  prompt += `\n\nTASK:\nReview the first-pass answers carefully. If any answer is wrong, correct it. Return ONLY final corrected JSON in the same structure.`;
  return prompt;
}

function constructPrompt(content) {
  let prompt = `ANALYZE THIS MCGRAW HILL SMARTBOOK QUESTION:\n\n`;
  
  content.questions.forEach((q, idx) => {
    prompt += `QUESTION ${idx + 1}: ${q.text}\n`;
    
    if (q.options.texts && q.options.texts.length > 0) {
      prompt += `\nOPTIONS:\n`;
      q.options.texts.forEach((opt, i) => {
        prompt += `${String.fromCharCode(65 + i)}) ${opt}\n`;
      });
    }
    
    prompt += `\nTYPE: ${q.isMultiple ? 'MULTIPLE SELECT (choose ALL that apply)' : 'SINGLE SELECT'}\n\n`;
  });

  prompt += `\nINSTRUCTIONS:
1. Identify ALL correct answers (if multiple select, return all correct indices)
2. Return ZERO-BASED indices (A=0, B=1, C=2)
3. Respond ONLY with this JSON:
{
  "answers": [
    {
      "question_index": 0,
      "correct_indices": [0, 2],
      "correct_letters": ["A", "C"],
      "is_multiple": true,
      "explanation": "brief reasoning"
    }
  ]
}`;

  return prompt;
}

function parseAIResponse(data) {
  try {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid response structure:', data);
      throw new Error('No choices in AI response');
    }
    
    const firstChoice = data.choices[0];
    if (!firstChoice.message || !firstChoice.message.content) {
      console.error('No message content:', firstChoice);
      throw new Error('No message content in AI response');
    }
    
    let content = firstChoice.message.content;
    console.log('Raw AI response:', content);
    
    // Extract JSON from markdown if wrapped in code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
      console.log('Extracted JSON from markdown:', content);
    }
    
    // Try to extract JSON object directly if contains extra text
    if (!content.trim().startsWith('{')) {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        content = objMatch[0];
        console.log('Extracted JSON object from text:', content);
      }
    }
    
    const parsed = JSON.parse(content);
    
    if (!parsed.answers || !Array.isArray(parsed.answers)) {
      console.error('Invalid answers format:', parsed);
      throw new Error('Invalid answer format from AI');
    }
    
    return { answers: parsed.answers };
  } catch (e) {
    console.error('Parse error:', e);
    console.error('Full response data:', data);
    throw new Error(`Failed to parse AI response: ${e.message}`);
  }
}

// Keep alive for long operations
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepalive') {
    port.onDisconnect.addListener(() => {});
    setInterval(() => {
      try {
        port.postMessage({ keepalive: true });
      } catch(e) {}
    }, 20000);
  }
});