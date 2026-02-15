import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import session from 'express-session';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''; // Alibaba Cloud DashScope for direct Qwen access
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'benjamin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'antikythera2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'agent-workspace-secret-change-in-production';

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
app.use(cors({ origin: true, credentials: true }));
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

// Load agents config
function loadAgents() {
  const configPath = join(__dirname, 'agents.config.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

// Conversation storage (in-memory for now, could be SQLite)
const conversations = {};

// Inter-agent message bus
const agentBus = {
  // Messages between agents
  messages: [],
  
  // Pending handoffs (agent A passes task to agent B)
  handoffs: [],
  
  // Agent status updates
  statusUpdates: [],
  
  // Send message from one agent to another
  send(fromAgent, toAgent, content, type = 'message') {
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: new Date().toISOString(),
      from: fromAgent,
      to: toAgent,
      content,
      type, // 'message', 'handoff', 'request', 'response'
      read: false
    };
    this.messages.push(msg);
    
    // Keep last 100 messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
    
    return msg;
  },
  
  // Create a handoff (formal task transfer)
  createHandoff(fromAgent, toAgent, task, context = {}) {
    const handoff = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: new Date().toISOString(),
      from: fromAgent,
      to: toAgent,
      task,
      context,
      status: 'pending' // pending, accepted, completed, rejected
    };
    this.handoffs.push(handoff);
    
    // Also send as a message
    this.send(fromAgent, toAgent, `HANDOFF: ${task}`, 'handoff');
    
    return handoff;
  },
  
  // Update handoff status
  updateHandoff(handoffId, status, result = null) {
    const handoff = this.handoffs.find(h => h.id === handoffId);
    if (handoff) {
      handoff.status = status;
      handoff.result = result;
      handoff.updatedAt = new Date().toISOString();
    }
    return handoff;
  },
  
  // Get messages for an agent
  getMessagesFor(agentId) {
    return this.messages.filter(m => m.to === agentId || m.to === 'all');
  },
  
  // Get all activity (for Overview)
  getAllActivity(limit = 50) {
    const allActivity = [
      ...this.messages.map(m => ({ ...m, activityType: 'message' })),
      ...this.handoffs.map(h => ({ ...h, activityType: 'handoff' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return allActivity.slice(0, limit);
  },
  
  // Get pending handoffs
  getPendingHandoffs() {
    return this.handoffs.filter(h => h.status === 'pending');
  },
  
  // Log status update
  logStatus(agentId, status, details = '') {
    this.statusUpdates.push({
      timestamp: new Date().toISOString(),
      agentId,
      status,
      details
    });
    
    // Keep last 50 status updates
    if (this.statusUpdates.length > 50) {
      this.statusUpdates = this.statusUpdates.slice(-50);
    }
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

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
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
  if (req.session && req.session.authenticated) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// ============ AGENT ROUTES ============

app.get('/api/agents', requireAuth, (req, res) => {
  const agents = loadAgents();
  // Return agents without system prompts (security)
  const publicAgents = Object.values(agents).map(a => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    color: a.color,
    group: a.group,
    model: a.model,
    status: 'idle'
  }));
  res.json(publicAgents);
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

// Update agent model on the fly
app.patch('/api/agents/:id', requireAuth, (req, res) => {
  const configPath = join(__dirname, 'agents.config.json');
  const agents = loadAgents();
  const agent = agents[req.params.id];
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Allow updating model, temperature, maxTokens
  if (req.body.model) agent.model = req.body.model;
  if (req.body.temperature !== undefined) agent.temperature = req.body.temperature;
  if (req.body.maxTokens !== undefined) agent.maxTokens = req.body.maxTokens;
  
  writeFileSync(configPath, JSON.stringify(agents, null, 2));
  res.json({ success: true, agent });
});

// ============ CHAT ROUTES ============

app.post('/api/chat', requireAuth, async (req, res) => {
  const { agentId, messages } = req.body;
  const agents = loadAgents();
  const agent = agents[agentId];
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Store conversation
  if (!conversations[agentId]) {
    conversations[agentId] = [];
  }
  
  // Add user message to history
  const userMessage = messages[messages.length - 1];
  conversations[agentId].push(userMessage);

  // Build messages with system prompt
  let systemContent = agent.systemPrompt;
  
  // Special handling for Overview agent - inject current system state
  if (agentId === 'overview') {
    const agents = loadAgents();
    const overviewContext = {
      timestamp: new Date().toISOString(),
      agentSummaries: {},
      pendingHandoffs: agentBus.getPendingHandoffs(),
      recentInterAgentMessages: agentBus.messages.slice(-10)
    };
    
    // Build agent summaries
    for (const [id, config] of Object.entries(agents)) {
      if (id !== 'overview') {
        const history = conversations[id] || [];
        const lastMsg = history[history.length - 1];
        overviewContext.agentSummaries[id] = {
          name: config.name,
          icon: config.icon,
          messageCount: history.length,
          lastMessage: lastMsg ? {
            role: lastMsg.role,
            preview: (lastMsg.content || '').substring(0, 200)
          } : null,
          pendingHandoffsTo: agentBus.handoffs.filter(h => h.to === id && h.status === 'pending').length,
          pendingHandoffsFrom: agentBus.handoffs.filter(h => h.from === id && h.status === 'pending').length
        };
      }
    }
    
    systemContent += `\n\n--- CURRENT SYSTEM STATE ---\n${JSON.stringify(overviewContext, null, 2)}\n--- END STATE ---`;
  }
  
  // Special handling for other agents - inject their inbox
  const inbox = agentBus.getMessagesFor(agentId).filter(m => !m.read);
  if (inbox.length > 0 && agentId !== 'overview') {
    const inboxContext = inbox.map(m => `[${m.from}]: ${m.content}`).join('\n');
    systemContent += `\n\n--- MESSAGES FROM OTHER AGENTS ---\n${inboxContext}\n--- END MESSAGES ---`;
    // Mark as read
    inbox.forEach(m => m.read = true);
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Store assistant response
            conversations[agentId].push({ role: 'assistant', content: fullResponse });
            
            // Process any inter-agent commands in the response
            processAgentCommands(agentId, fullResponse);
            
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // Skip unparseable chunks
            }
          }
        }
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  }

  res.end();
});

// Get conversation history
app.get('/api/conversations/:agentId', requireAuth, (req, res) => {
  const history = conversations[req.params.agentId] || [];
  res.json(history);
});

// Clear conversation
app.delete('/api/conversations/:agentId', requireAuth, (req, res) => {
  conversations[req.params.agentId] = [];
  res.json({ success: true });
});

// ============ INTER-AGENT COMMUNICATION ROUTES ============

// Send message from one agent to another
app.post('/api/agents/:fromId/send', requireAuth, (req, res) => {
  const { toAgent, content, type } = req.body;
  const fromAgent = req.params.fromId;
  
  const agents = loadAgents();
  if (!agents[fromAgent]) {
    return res.status(404).json({ error: 'Source agent not found' });
  }
  if (toAgent !== 'all' && !agents[toAgent]) {
    return res.status(404).json({ error: 'Target agent not found' });
  }
  
  const msg = agentBus.send(fromAgent, toAgent, content, type);
  res.json({ success: true, message: msg });
});

// Create a handoff between agents
app.post('/api/handoffs', requireAuth, (req, res) => {
  const { fromAgent, toAgent, task, context } = req.body;
  
  const agents = loadAgents();
  if (!agents[fromAgent] || !agents[toAgent]) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const handoff = agentBus.createHandoff(fromAgent, toAgent, task, context);
  res.json({ success: true, handoff });
});

// Update handoff status
app.patch('/api/handoffs/:id', requireAuth, (req, res) => {
  const { status, result } = req.body;
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

// ============ OVERVIEW SPECIAL ROUTE ============

app.get('/api/overview', requireAuth, (req, res) => {
  // Comprehensive summary for Overview agent
  const agents = loadAgents();
  const summary = {
    conversations: {},
    pendingHandoffs: agentBus.getPendingHandoffs(),
    recentActivity: agentBus.getAllActivity(20),
    agentStatuses: {}
  };
  
  // Conversation summaries per agent
  for (const [agentId, history] of Object.entries(conversations)) {
    if (agentId !== 'overview') {
      const agentConfig = agents[agentId];
      summary.conversations[agentId] = {
        name: agentConfig?.name || agentId,
        icon: agentConfig?.icon || '🤖',
        messageCount: history.length,
        lastActivity: history.length > 0 ? 'active' : 'idle',
        lastMessages: history.slice(-3).map(m => ({
          role: m.role,
          preview: m.content?.substring(0, 150) + (m.content?.length > 150 ? '...' : '')
        })),
        // Include any pending handoffs to/from this agent
        pendingTo: agentBus.handoffs.filter(h => h.to === agentId && h.status === 'pending'),
        pendingFrom: agentBus.handoffs.filter(h => h.from === agentId && h.status === 'pending')
      };
    }
  }
  
  // Add agents with no conversations yet
  for (const [agentId, agentConfig] of Object.entries(agents)) {
    if (agentId !== 'overview' && !summary.conversations[agentId]) {
      summary.conversations[agentId] = {
        name: agentConfig.name,
        icon: agentConfig.icon,
        messageCount: 0,
        lastActivity: 'idle',
        lastMessages: [],
        pendingTo: agentBus.handoffs.filter(h => h.to === agentId && h.status === 'pending'),
        pendingFrom: agentBus.handoffs.filter(h => h.from === agentId && h.status === 'pending')
      };
    }
  }
  
  res.json(summary);
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent Workspace server running on port ${PORT}`);
  console.log(`📋 ${Object.keys(loadAgents()).length} agents loaded`);
  console.log(`🔐 Auth required: username=${AUTH_USERNAME}`);
});
