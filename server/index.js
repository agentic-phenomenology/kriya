import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db, { conversationDB, handoffDB, messageDB, settingsDB, customAgentsDB, openclawDB, generateId } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Config — all secrets must come from environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const AUTH_USERNAME = process.env.AUTH_USERNAME || '';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

// Validate required config at startup
const missingVars = [];
if (!OPENROUTER_API_KEY) missingVars.push('OPENROUTER_API_KEY');
if (!AUTH_USERNAME) missingVars.push('AUTH_USERNAME');
if (!AUTH_PASSWORD) missingVars.push('AUTH_PASSWORD');
if (!SESSION_SECRET) missingVars.push('SESSION_SECRET');
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

// OpenClaw webhook config
const OPENCLAW_WEBHOOK_URL = process.env.OPENCLAW_WEBHOOK_URL || 'http://localhost:3002/webhook';
const OPENCLAW_WEBHOOK_SECRET = process.env.OPENCLAW_WEBHOOK_SECRET || '';

// Provider configurations
const PROVIDERS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    getHeaders: () => ({
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://agent-workspace.local',
      'X-Title': 'Agent Workspace'
    })
  },
  openclaw: {
    // Special provider that routes to the real Computer the Cat
    isWebhook: true
  },
  dashscope: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    getHeaders: () => ({
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    // DashScope model mapping (latest Qwen models)
    models: {
      'qwen-max': 'qwen-max-latest',
      'qwen-max-thinking': 'qwen-max-latest', // Use max with thinking prompt
      'qwen-plus': 'qwen-plus-latest',
      'qwen-turbo': 'qwen-turbo-latest',
      'qwen-coder': 'qwen-coder-plus-latest',
      'qwen-vl': 'qwen-vl-max-latest',
      'qwq': 'qwq-plus-latest' // QwQ reasoning model
    }
  }
};

// Middleware
// CORS disabled for local development - allow all origins
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Load agents config — cached with file-watch reload
let agentsCache = null;
let agentsCachePath = join(__dirname, 'agents.config.json');

function loadAgents() {
  if (!agentsCache) {
    agentsCache = JSON.parse(readFileSync(agentsCachePath, 'utf-8'));
  }
  return agentsCache;
}

function saveAgents(agents) {
  writeFileSync(agentsCachePath, JSON.stringify(agents, null, 2));
  agentsCache = agents;
}

// Merge default agent config with user's custom settings
function getAgentWithUserSettings(agentConfig, userSettings) {
  if (!userSettings) return agentConfig;
  return {
    ...agentConfig,
    model: userSettings.model || agentConfig.model,
    temperature: userSettings.temperature ?? agentConfig.temperature,
    maxTokens: userSettings.max_tokens ?? agentConfig.maxTokens,
    systemPrompt: userSettings.system_prompt || agentConfig.systemPrompt,
    color: userSettings.color || agentConfig.color,
    icon: userSettings.icon || agentConfig.icon,
    displayOrder: userSettings.display_order ?? agentConfig.displayOrder
  };
}

// Convert custom agent DB row to agent config format
function customAgentToConfig(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    model: row.model,
    systemPrompt: row.system_prompt,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    displayOrder: row.display_order,
    group: 'Custom',
    isCustom: true
  };
}

// Conversation storage — now using SQLite via db.js
// conversationDB.add(agentId, role, content) to store
// conversationDB.get(agentId) to retrieve

// Inter-agent message bus — SQLite-backed
const agentBus = {
  // Send message from one agent to another
  send(fromAgent, toAgent, content, type = 'message') {
    const id = generateId();
    messageDB.send(id, fromAgent, toAgent, content, type);
    return {
      id,
      timestamp: new Date().toISOString(),
      from: fromAgent,
      to: toAgent,
      content,
      type,
      read: false
    };
  },
  
  // Create a handoff (formal task transfer)
  createHandoff(fromAgent, toAgent, task, context = {}) {
    const id = generateId();
    handoffDB.create(id, fromAgent, toAgent, task, context);
    
    // Also send as a message
    this.send(fromAgent, toAgent, `HANDOFF: ${task}`, 'handoff');
    
    return {
      id,
      timestamp: new Date().toISOString(),
      from: fromAgent,
      to: toAgent,
      task,
      context,
      status: 'pending'
    };
  },
  
  // Update handoff status
  updateHandoff(handoffId, status, result = null) {
    handoffDB.update(handoffId, status, result);
    return handoffDB.get(handoffId);
  },
  
  // Get messages for an agent
  getMessagesFor(agentId) {
    return messageDB.getFor(agentId, 100);
  },
  
  // Get unread messages for an agent
  getUnreadFor(agentId) {
    return messageDB.getUnread(agentId);
  },
  
  // Mark message as read
  markRead(messageId) {
    return messageDB.markRead(messageId);
  },
  
  // Get all activity (for Overview)
  getAllActivity(limit = 50) {
    return messageDB.getAllActivity(limit);
  },
  
  // Get pending handoffs
  getPendingHandoffs() {
    return handoffDB.getPending();
  },
  
  // Get all handoffs
  getAllHandoffs(limit = 50) {
    return handoffDB.getAll(limit);
  }
};

// Process inter-agent commands in responses
function processAgentCommands(fromAgentId, responseText) {
  const agents = loadAgents();
  
  // Detect handoff patterns: [HANDOFF:agentId] message
  // e.g., "[HANDOFF:code] Please implement the API based on these specs"
  const handoffPattern = /\[HANDOFF:(\w+)\]\s*(.+?)(?=\[HANDOFF:|$)/gs;
  let match;
  while ((match = handoffPattern.exec(responseText)) !== null) {
    const toAgentId = match[1].toLowerCase();
    const task = match[2].trim();
    
    if (agents[toAgentId]) {
      agentBus.createHandoff(fromAgentId, toAgentId, task, {
        sourceResponse: responseText.substring(0, 500)
      });
      console.log(`📋 Handoff created: ${fromAgentId} → ${toAgentId}: ${task.substring(0, 50)}...`);
    }
  }
  
  // Detect message patterns: [MSG:agentId] message
  // e.g., "[MSG:security] Can you review this for vulnerabilities?"
  const msgPattern = /\[MSG:(\w+)\]\s*(.+?)(?=\[MSG:|$)/gs;
  while ((match = msgPattern.exec(responseText)) !== null) {
    const toAgentId = match[1].toLowerCase();
    const content = match[2].trim();
    
    if (agents[toAgentId]) {
      agentBus.send(fromAgentId, toAgentId, content, 'request');
      console.log(`💬 Message sent: ${fromAgentId} → ${toAgentId}: ${content.substring(0, 50)}...`);
    }
  }
  
  // Detect broadcast patterns: [BROADCAST] message
  const broadcastPattern = /\[BROADCAST\]\s*(.+?)(?=\[BROADCAST\]|$)/gs;
  while ((match = broadcastPattern.exec(responseText)) !== null) {
    const content = match[1].trim();
    agentBus.send(fromAgentId, 'all', content, 'broadcast');
    console.log(`📢 Broadcast from ${fromAgentId}: ${content.substring(0, 50)}...`);
  }
}

// Auth middleware (bypassed for development)
function requireAuth(req, res, next) {
  // Bypass auth - auto-authenticate
  req.session.authenticated = true;
  req.session.user = 'benjamin';
  return next();
}

// ============ AUTH ROUTES ============

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    req.session.authenticated = true;
    req.session.user = username;
    res.json({ success: true, user: username });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  // Always return authenticated for development
  res.json({ authenticated: true, user: 'benjamin' });
});

// ============ AGENT ROUTES ============

app.get('/api/agents', requireAuth, (req, res) => {
  const userId = req.session.user;
  const defaultAgents = loadAgents();
  const userSettings = settingsDB.getAll(userId);
  const customAgents = customAgentsDB.getAll(userId);
  
  // Build settings lookup
  const settingsMap = {};
  for (const s of userSettings) {
    settingsMap[s.agent_id] = s;
  }
  
  // Merge default agents with user settings
  const mergedAgents = Object.values(defaultAgents).map(a => {
    const merged = getAgentWithUserSettings(a, settingsMap[a.id]);
    return {
      id: merged.id,
      name: merged.name,
      icon: merged.icon,
      color: merged.color,
      group: merged.group,
      model: merged.model,
      temperature: merged.temperature,
      maxTokens: merged.maxTokens,
      displayOrder: merged.displayOrder ?? 100,
      status: 'idle',
      isCustom: false
    };
  });
  
  // Add custom agents
  for (const ca of customAgents) {
    mergedAgents.push({
      id: ca.id,
      name: ca.name,
      icon: ca.icon,
      color: ca.color,
      group: 'Custom',
      model: ca.model,
      temperature: ca.temperature,
      maxTokens: ca.max_tokens,
      displayOrder: ca.display_order ?? 999,
      status: 'idle',
      isCustom: true
    });
  }
  
  // Sort by displayOrder
  mergedAgents.sort((a, b) => (a.displayOrder ?? 100) - (b.displayOrder ?? 100));
  
  res.json(mergedAgents);
});

app.get('/api/agents/:id', requireAuth, (req, res) => {
  const agents = loadAgents();
  const agent = agents[req.params.id];
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
    color: agent.color,
    group: agent.group,
    model: agent.model
  });
});

// Update agent settings (user-specific, synced)
app.patch('/api/agents/:id/settings', requireAuth, (req, res) => {
  const userId = req.session.user;
  const agentId = req.params.id;
  const { model, temperature, maxTokens, systemPrompt, color, icon } = req.body;
  
  // Validate inputs
  const settings = {};
  if (model && typeof model === 'string') settings.model = model.slice(0, 200);
  if (temperature !== undefined) {
    const temp = Number(temperature);
    if (!isNaN(temp) && temp >= 0 && temp <= 2) settings.temperature = temp;
  }
  if (maxTokens !== undefined) {
    const tokens = Number(maxTokens);
    if (!isNaN(tokens) && tokens > 0 && tokens <= 128000) settings.maxTokens = tokens;
  }
  if (systemPrompt && typeof systemPrompt === 'string') settings.systemPrompt = systemPrompt.slice(0, 50000);
  if (color && typeof color === 'string') settings.color = color.slice(0, 20);
  if (icon && typeof icon === 'string') settings.icon = icon.slice(0, 10);
  
  settingsDB.upsert(userId, agentId, settings);
  
  // Return merged settings
  const userSettings = settingsDB.get(userId, agentId);
  res.json({ success: true, settings: userSettings });
});

// Update agent order (drag-and-drop reordering)
app.put('/api/agents/order', requireAuth, (req, res) => {
  const userId = req.session.user;
  const { order } = req.body;
  
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of { agentId, order }' });
  }
  
  // Validate and sanitize
  const agentOrders = order.map((item, idx) => ({
    agentId: String(item.agentId || item.id).slice(0, 100),
    order: typeof item.order === 'number' ? item.order : idx
  }));
  
  settingsDB.updateOrder(userId, agentOrders);
  res.json({ success: true });
});

// Create custom agent
app.post('/api/agents', requireAuth, (req, res) => {
  const userId = req.session.user;
  const { name, icon, color, model, systemPrompt, temperature, maxTokens } = req.body;
  
  if (!name || typeof name !== 'string' || name.length < 1) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'model is required' });
  }
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'systemPrompt is required' });
  }
  
  const agent = customAgentsDB.create(userId, {
    name: name.slice(0, 100),
    icon: icon?.slice(0, 10) || '🤖',
    color: color?.slice(0, 20) || '#6366f1',
    model: model.slice(0, 200),
    systemPrompt: systemPrompt.slice(0, 50000),
    temperature: typeof temperature === 'number' ? Math.min(2, Math.max(0, temperature)) : 0.7,
    maxTokens: typeof maxTokens === 'number' ? Math.min(128000, Math.max(1, maxTokens)) : 4096
  });
  
  res.json({ success: true, agent });
});

// Update custom agent
app.put('/api/agents/:id', requireAuth, (req, res) => {
  const agentId = req.params.id;
  
  // Check if it's a custom agent
  if (!agentId.startsWith('custom_')) {
    return res.status(400).json({ error: 'Can only directly update custom agents. Use PATCH /api/agents/:id/settings for default agents.' });
  }
  
  const { name, icon, color, model, systemPrompt, temperature, maxTokens } = req.body;
  const updates = {};
  
  if (name) updates.name = String(name).slice(0, 100);
  if (icon) updates.icon = String(icon).slice(0, 10);
  if (color) updates.color = String(color).slice(0, 20);
  if (model) updates.model = String(model).slice(0, 200);
  if (systemPrompt) updates.systemPrompt = String(systemPrompt).slice(0, 50000);
  if (temperature !== undefined) updates.temperature = Math.min(2, Math.max(0, Number(temperature)));
  if (maxTokens !== undefined) updates.maxTokens = Math.min(128000, Math.max(1, Number(maxTokens)));
  
  const updated = customAgentsDB.update(agentId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Custom agent not found' });
  }
  
  res.json({ success: true, agent: updated });
});

// Delete custom agent
app.delete('/api/agents/:id', requireAuth, (req, res) => {
  const userId = req.session.user;
  const agentId = req.params.id;
  
  if (!agentId.startsWith('custom_')) {
    return res.status(400).json({ error: 'Can only delete custom agents' });
  }
  
  const result = customAgentsDB.delete(agentId, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Custom agent not found' });
  }
  
  // Also clear conversation history
  conversationDB.clear(agentId);
  
  res.json({ success: true });
});

// ============ CHAT ROUTES ============

app.post('/api/chat', requireAuth, async (req, res) => {
  const { agentId, messages } = req.body;

  // Input validation
  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'agentId is required and must be a string' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }
  for (const msg of messages) {
    if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
      return res.status(400).json({ error: 'Each message must have a valid role' });
    }
    if (typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Each message must have string content' });
    }
  }

  const userId = req.session.user;
  let agent;
  
  // Check if it's a custom agent
  if (agentId.startsWith('custom_')) {
    const customAgent = customAgentsDB.get(agentId);
    if (customAgent) {
      agent = customAgentToConfig(customAgent);
    }
  } else {
    // Default agent - merge with user settings
    const defaultAgents = loadAgents();
    const defaultAgent = defaultAgents[agentId];
    if (defaultAgent) {
      const userSettings = settingsDB.get(userId, agentId);
      agent = getAgentWithUserSettings(defaultAgent, userSettings);
    }
  }

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Store user message in SQLite
  const userMessage = messages[messages.length - 1];
  conversationDB.add(agentId, userMessage.role, userMessage.content);

  // ========== SPECIAL HANDLING: Computer the Cat (OpenClaw Bridge) ==========
  // Route messages to the real Computer via queue-based polling
  if (agent.name === 'Computer the Cat') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Queue the message for Computer to pick up
    const queueId = openclawDB.queue(agentId, JSON.stringify({
      messages: messages,
      user: userId,
      timestamp: new Date().toISOString()
    }));

    console.log(`🐱 Queued message for Computer the Cat: ${queueId}`);

    // Poll for response (with timeout)
    const maxWait = 120000; // 2 minutes
    const pollInterval = 500; // 500ms
    const startTime = Date.now();
    let responded = false;

    const pollForResponse = async () => {
      while (Date.now() - startTime < maxWait && !responded) {
        const msg = openclawDB.get(queueId);
        if (msg && msg.status === 'completed' && msg.response) {
          responded = true;
          const response = msg.response;
          
          // Store in conversation
          conversationDB.add(agentId, 'assistant', response);
          
          // Stream the response (simulate streaming for consistency)
          const words = response.split(' ');
          for (const word of words) {
            res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
            await new Promise(r => setTimeout(r, 20));
          }
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
        await new Promise(r => setTimeout(r, pollInterval));
      }

      if (!responded) {
        res.write(`data: ${JSON.stringify({ content: '*purrs while thinking...*\n\n(Response pending - Computer is processing. Check back or refresh.)' })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    };

    pollForResponse();
    return;
  }
  // ========== END OPENCLAW BRIDGE ==========

  // Build messages with system prompt
  let systemContent = agent.systemPrompt;
  
  // Special handling for Overview agent - inject current system state
  if (agentId === 'overview') {
    const allAgents = loadAgents();
    const overviewContext = {
      timestamp: new Date().toISOString(),
      agentSummaries: {},
      pendingHandoffs: agentBus.getPendingHandoffs(),
      recentInterAgentMessages: agentBus.getAllActivity(10)
    };
    
    // Build agent summaries from SQLite
    for (const [id, config] of Object.entries(allAgents)) {
      if (id !== 'overview') {
        const history = conversationDB.get(id);
        const lastMsg = history[history.length - 1];
        const pendingHandoffs = agentBus.getPendingHandoffs();
        overviewContext.agentSummaries[id] = {
          name: config.name,
          icon: config.icon,
          messageCount: history.length,
          lastMessage: lastMsg ? {
            role: lastMsg.role,
            preview: (lastMsg.content || '').substring(0, 200)
          } : null,
          pendingHandoffsTo: pendingHandoffs.filter(h => h.to_agent === id).length,
          pendingHandoffsFrom: pendingHandoffs.filter(h => h.from_agent === id).length
        };
      }
    }
    
    systemContent += `\n\n--- CURRENT SYSTEM STATE ---\n${JSON.stringify(overviewContext, null, 2)}\n--- END STATE ---`;
  }
  
  // Special handling for other agents - inject their inbox
  const inbox = agentBus.getUnreadFor(agentId);
  if (inbox.length > 0 && agentId !== 'overview') {
    const inboxContext = inbox.map(m => `[${m.from_agent}]: ${m.content}`).join('\n');
    systemContent += `\n\n--- MESSAGES FROM OTHER AGENTS ---\n${inboxContext}\n--- END MESSAGES ---`;
    // Mark as read
    inbox.forEach(m => agentBus.markRead(m.id));
  }
  
  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages
  ];

  // Determine provider and model
  const provider = agent.provider || 'openrouter';
  const providerConfig = PROVIDERS[provider];
  
  if (!providerConfig) {
    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;
  }

  // Check if DashScope is configured when trying to use it
  if (provider === 'dashscope' && !DASHSCOPE_API_KEY) {
    res.status(400).json({ error: 'DashScope API key not configured. Set DASHSCOPE_API_KEY environment variable.' });
    return;
  }

  // Get the model name (translate if using DashScope)
  let modelName = agent.model;
  if (provider === 'dashscope' && providerConfig.models[agent.model]) {
    modelName = providerConfig.models[agent.model];
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: providerConfig.getHeaders(),
      body: JSON.stringify({
        model: modelName,
        messages: apiMessages,
        temperature: agent.temperature || 0.7,
        max_tokens: agent.maxTokens || 4096,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      res.write(`data: ${JSON.stringify({ error: `API error: ${error}` })}\n\n`);
      res.end();
      return;
    }

    // Handle client disconnect
    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let lineBuffer = ''; // Buffer for handling chunk boundaries

    while (true) {
      if (clientDisconnected) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      // Keep the last incomplete line in the buffer
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          // Store assistant response in SQLite
          conversationDB.add(agentId, 'assistant', fullResponse);

          // Process any inter-agent commands in the response
          processAgentCommands(agentId, fullResponse);

          if (!clientDisconnected) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } else {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              if (!clientDisconnected) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            }
          } catch (_) {
            // Skip unparseable chunks
          }
        }
      }
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

// Get conversation history from SQLite
app.get('/api/conversations/:agentId', requireAuth, (req, res) => {
  const history = conversationDB.get(req.params.agentId);
  res.json(history);
});

// Clear conversation
app.delete('/api/conversations/:agentId', requireAuth, (req, res) => {
  conversationDB.clear(req.params.agentId);
  res.json({ success: true });
});

// ============ INTER-AGENT COMMUNICATION ROUTES ============

// Send message from one agent to another
app.post('/api/agents/:fromId/send', requireAuth, (req, res) => {
  const { toAgent, content, type } = req.body;
  const fromAgent = req.params.fromId;

  if (!toAgent || typeof toAgent !== 'string') {
    return res.status(400).json({ error: 'toAgent is required' });
  }
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required and must be a string' });
  }
  if (content.length > 10000) {
    return res.status(400).json({ error: 'content exceeds maximum length (10000)' });
  }

  const agents = loadAgents();
  if (!agents[fromAgent]) {
    return res.status(404).json({ error: 'Source agent not found' });
  }
  if (toAgent !== 'all' && !agents[toAgent]) {
    return res.status(404).json({ error: 'Target agent not found' });
  }

  const validTypes = ['message', 'handoff', 'request', 'response', 'broadcast'];
  const msgType = validTypes.includes(type) ? type : 'message';

  const msg = agentBus.send(fromAgent, toAgent, content, msgType);
  res.json({ success: true, message: msg });
});

// Create a handoff between agents
app.post('/api/handoffs', requireAuth, (req, res) => {
  const { fromAgent, toAgent, task, context } = req.body;

  if (!fromAgent || !toAgent || !task) {
    return res.status(400).json({ error: 'fromAgent, toAgent, and task are required' });
  }
  if (typeof task !== 'string' || task.length > 10000) {
    return res.status(400).json({ error: 'task must be a string under 10000 characters' });
  }

  const agents = loadAgents();
  if (!agents[fromAgent] || !agents[toAgent]) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const handoff = agentBus.createHandoff(fromAgent, toAgent, task, context || {});
  res.json({ success: true, handoff });
});

// Update handoff status
app.patch('/api/handoffs/:id', requireAuth, (req, res) => {
  const { status, result } = req.body;

  const validStatuses = ['pending', 'accepted', 'completed', 'rejected'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const handoff = agentBus.updateHandoff(req.params.id, status, result);

  if (!handoff) {
    return res.status(404).json({ error: 'Handoff not found' });
  }

  res.json({ success: true, handoff });
});

// Get all pending handoffs
app.get('/api/handoffs', requireAuth, (req, res) => {
  const pending = agentBus.getPendingHandoffs();
  const all = req.query.all === 'true' ? agentBus.handoffs : pending;
  res.json(all);
});

// Get messages for a specific agent
app.get('/api/agents/:id/inbox', requireAuth, (req, res) => {
  const messages = agentBus.getMessagesFor(req.params.id);
  res.json(messages);
});

// Get all inter-agent activity (for Overview)
app.get('/api/activity', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const activity = agentBus.getAllActivity(limit);
  res.json(activity);
});

// ============ TASKS ROUTES (Asana-like views on handoffs) ============

// List all tasks (handoffs)
app.get('/api/tasks', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const tasks = handoffDB.getAll(limit);
  res.json(tasks);
});

// Create a new task
app.post('/api/tasks', requireAuth, (req, res) => {
  const { task, from_agent, to_agent, status, context } = req.body;
  
  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'task description is required' });
  }
  if (!from_agent || !to_agent) {
    return res.status(400).json({ error: 'from_agent and to_agent are required' });
  }
  
  const id = generateId();
  handoffDB.create(id, from_agent, to_agent, task.slice(0, 10000), context || {});
  
  // Update status if provided (defaults to 'pending')
  if (status && ['pending', 'accepted', 'completed', 'rejected'].includes(status)) {
    handoffDB.update(id, status, null);
  }
  
  const created = handoffDB.get(id);
  res.json(created);
});

// Update a task
app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, result, task, from_agent, to_agent } = req.body;
  
  const existing = handoffDB.get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // For now, we only support updating status and result through the existing API
  // To update other fields, we'd need to extend the DB schema/methods
  if (status) {
    const validStatuses = ['pending', 'accepted', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }
    handoffDB.update(id, status, result || existing.result);
  }
  
  const updated = handoffDB.get(id);
  res.json(updated);
});

// Delete a task
app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  const existing = handoffDB.get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Delete from database (need to add this method)
  try {
    const stmt = db.prepare('DELETE FROM handoffs WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ============ OVERVIEW SPECIAL ROUTE ============

app.get('/api/overview', requireAuth, (req, res) => {
  // Comprehensive summary for Overview agent — using SQLite
  const agents = loadAgents();
  const pendingHandoffs = agentBus.getPendingHandoffs();
  const summary = {
    conversations: {},
    pendingHandoffs,
    recentActivity: agentBus.getAllActivity(20),
    agentStatuses: {}
  };
  
  // Conversation summaries per agent from SQLite
  for (const [agentId, agentConfig] of Object.entries(agents)) {
    if (agentId !== 'overview') {
      const history = conversationDB.get(agentId);
      summary.conversations[agentId] = {
        name: agentConfig.name,
        icon: agentConfig.icon,
        messageCount: history.length,
        lastActivity: history.length > 0 ? 'active' : 'idle',
        lastMessages: history.slice(-3).map(m => ({
          role: m.role,
          preview: m.content?.substring(0, 150) + (m.content?.length > 150 ? '...' : '')
        })),
        pendingTo: pendingHandoffs.filter(h => h.to_agent === agentId),
        pendingFrom: pendingHandoffs.filter(h => h.from_agent === agentId)
      };
    }
  }
  
  res.json(summary);
});

// ============ OPENCLAW BRIDGE ROUTES ============
// These allow the real Computer the Cat to poll for messages and respond

// Get pending messages for OpenClaw (Computer polls this)
app.get('/api/openclaw/pending', (req, res) => {
  // Simple auth via secret header
  const secret = req.headers['x-openclaw-secret'];
  if (secret !== OPENCLAW_WEBHOOK_SECRET && OPENCLAW_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  
  const pending = openclawDB.getPending();
  res.json(pending);
});

// Submit response from OpenClaw
app.post('/api/openclaw/:id/respond', (req, res) => {
  const secret = req.headers['x-openclaw-secret'];
  if (secret !== OPENCLAW_WEBHOOK_SECRET && OPENCLAW_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  
  const { id } = req.params;
  const { response } = req.body;
  
  if (!response) {
    return res.status(400).json({ error: 'response is required' });
  }
  
  openclawDB.complete(id, response);
  res.json({ success: true });
});

// Check if a specific message has a response (for polling)
app.get('/api/openclaw/:id', (req, res) => {
  const secret = req.headers['x-openclaw-secret'];
  if (secret !== OPENCLAW_WEBHOOK_SECRET && OPENCLAW_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  
  const msg = openclawDB.get(req.params.id);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json(msg);
});

// ============ MODELS ROUTE ============

app.get('/api/models', requireAuth, async (req, res) => {
  // Return list of available models from OpenRouter
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      }
    });
    const data = await response.json();
    res.json(data.data || []);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Agent Workspace server running on port ${PORT}`);
  console.log(`📋 ${Object.keys(loadAgents()).length} agents loaded`);
  console.log(`🔐 Auth required: username=${AUTH_USERNAME}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  // Force close after 5s
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
