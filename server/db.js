import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'kriya.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Conversations table
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    metadata TEXT  -- JSON for additional data
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);

  -- Handoffs between agents
  CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    task TEXT NOT NULL,
    context TEXT,  -- JSON
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'rejected')),
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status);
  CREATE INDEX IF NOT EXISTS idx_handoffs_to ON handoffs(to_agent);

  -- User agent settings (synced across devices)
  CREATE TABLE IF NOT EXISTS user_agent_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    model TEXT,
    temperature REAL,
    max_tokens INTEGER,
    system_prompt TEXT,
    color TEXT,
    icon TEXT,
    display_order INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, agent_id)
  );

  CREATE INDEX IF NOT EXISTS idx_settings_user ON user_agent_settings(user_id);

  -- Custom agents created by users
  CREATE TABLE IF NOT EXISTS custom_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🤖',
    color TEXT DEFAULT '#6366f1',
    model TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    display_order INTEGER DEFAULT 999,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_custom_agents_user ON custom_agents(user_id);

  -- Inter-agent messages
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'message' CHECK(type IN ('message', 'handoff', 'request', 'response', 'broadcast')),
    read INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_agent);
  CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

  -- OpenClaw bridge queue (for routing messages to real Computer the Cat)
  CREATE TABLE IF NOT EXISTS openclaw_queue (
    id TEXT PRIMARY KEY,
    direction TEXT NOT NULL CHECK(direction IN ('to_openclaw', 'from_openclaw')),
    conversation_id TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed')),
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_openclaw_queue_status ON openclaw_queue(status);
  CREATE INDEX IF NOT EXISTS idx_openclaw_queue_conv ON openclaw_queue(conversation_id);
`);

// Prepared statements for performance
const stmts = {
  // Conversations
  insertMessage: db.prepare(`
    INSERT INTO conversations (agent_id, role, content, session_id, metadata)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getConversation: db.prepare(`
    SELECT id, role, content, timestamp, metadata
    FROM conversations
    WHERE agent_id = ?
    ORDER BY timestamp ASC
  `),
  
  getConversationLimit: db.prepare(`
    SELECT id, role, content, timestamp, metadata
    FROM conversations
    WHERE agent_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `),
  
  clearConversation: db.prepare(`
    DELETE FROM conversations WHERE agent_id = ?
  `),
  
  getRecentByAgent: db.prepare(`
    SELECT agent_id, role, content, timestamp
    FROM conversations
    WHERE agent_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `),

  // Handoffs
  insertHandoff: db.prepare(`
    INSERT INTO handoffs (id, from_agent, to_agent, task, context, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `),
  
  updateHandoff: db.prepare(`
    UPDATE handoffs
    SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  getPendingHandoffs: db.prepare(`
    SELECT * FROM handoffs WHERE status = 'pending'
  `),
  
  getAllHandoffs: db.prepare(`
    SELECT * FROM handoffs ORDER BY created_at DESC LIMIT ?
  `),
  
  getHandoff: db.prepare(`
    SELECT * FROM handoffs WHERE id = ?
  `),

  // Messages
  insertAgentMessage: db.prepare(`
    INSERT INTO messages (id, from_agent, to_agent, content, type)
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getMessagesFor: db.prepare(`
    SELECT * FROM messages
    WHERE to_agent = ? OR to_agent = 'all'
    ORDER BY timestamp DESC
    LIMIT ?
  `),
  
  getUnreadFor: db.prepare(`
    SELECT * FROM messages
    WHERE (to_agent = ? OR to_agent = 'all') AND read = 0
    ORDER BY timestamp ASC
  `),
  
  markRead: db.prepare(`
    UPDATE messages SET read = 1 WHERE id = ?
  `),
  
  getAllActivity: db.prepare(`
    SELECT 
      id, from_agent, to_agent, content, type, timestamp,
      'message' as activity_type
    FROM messages
    ORDER BY timestamp DESC
    LIMIT ?
  `),

  // User Agent Settings
  getSettings: db.prepare(`
    SELECT * FROM user_agent_settings WHERE user_id = ? AND agent_id = ?
  `),
  
  getAllSettings: db.prepare(`
    SELECT * FROM user_agent_settings WHERE user_id = ? ORDER BY display_order ASC
  `),
  
  upsertSettings: db.prepare(`
    INSERT INTO user_agent_settings (user_id, agent_id, model, temperature, max_tokens, system_prompt, color, icon, display_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, agent_id) DO UPDATE SET
      model = COALESCE(excluded.model, model),
      temperature = COALESCE(excluded.temperature, temperature),
      max_tokens = COALESCE(excluded.max_tokens, max_tokens),
      system_prompt = COALESCE(excluded.system_prompt, system_prompt),
      color = COALESCE(excluded.color, color),
      icon = COALESCE(excluded.icon, icon),
      display_order = COALESCE(excluded.display_order, display_order),
      updated_at = CURRENT_TIMESTAMP
  `),
  
  updateAgentOrder: db.prepare(`
    INSERT INTO user_agent_settings (user_id, agent_id, display_order, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, agent_id) DO UPDATE SET
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `),

  // Custom Agents
  createCustomAgent: db.prepare(`
    INSERT INTO custom_agents (id, user_id, name, icon, color, model, system_prompt, temperature, max_tokens, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getCustomAgents: db.prepare(`
    SELECT * FROM custom_agents WHERE user_id = ? ORDER BY display_order ASC
  `),
  
  getCustomAgent: db.prepare(`
    SELECT * FROM custom_agents WHERE id = ?
  `),
  
  updateCustomAgent: db.prepare(`
    UPDATE custom_agents SET
      name = COALESCE(?, name),
      icon = COALESCE(?, icon),
      color = COALESCE(?, color),
      model = COALESCE(?, model),
      system_prompt = COALESCE(?, system_prompt),
      temperature = COALESCE(?, temperature),
      max_tokens = COALESCE(?, max_tokens),
      display_order = COALESCE(?, display_order),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  deleteCustomAgent: db.prepare(`
    DELETE FROM custom_agents WHERE id = ? AND user_id = ?
  `),

  // OpenClaw Queue
  queueToOpenclaw: db.prepare(`
    INSERT INTO openclaw_queue (id, direction, conversation_id, content, status)
    VALUES (?, 'to_openclaw', ?, ?, 'pending')
  `),
  
  getOpenclawPending: db.prepare(`
    SELECT * FROM openclaw_queue 
    WHERE direction = 'to_openclaw' AND status = 'pending'
    ORDER BY created_at ASC
  `),
  
  updateOpenclawStatus: db.prepare(`
    UPDATE openclaw_queue 
    SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  getOpenclawMessage: db.prepare(`
    SELECT * FROM openclaw_queue WHERE id = ?
  `)
};

// Database API
export const conversationDB = {
  // Add a message to conversation
  add(agentId, role, content, sessionId = null, metadata = null) {
    return stmts.insertMessage.run(
      agentId, role, content, sessionId,
      metadata ? JSON.stringify(metadata) : null
    );
  },

  // Get full conversation for an agent
  get(agentId) {
    const rows = stmts.getConversation.all(agentId);
    return rows.map(r => ({
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      metadata: r.metadata ? JSON.parse(r.metadata) : null
    }));
  },

  // Get recent messages (for context window)
  getRecent(agentId, limit = 20) {
    const rows = stmts.getConversationLimit.all(agentId, limit);
    return rows.reverse().map(r => ({
      role: r.role,
      content: r.content
    }));
  },

  // Clear conversation
  clear(agentId) {
    return stmts.clearConversation.run(agentId);
  },

  // Get summary for overview
  getSummary(agentId, limit = 3) {
    const rows = stmts.getRecentByAgent.all(agentId, limit);
    return rows.reverse();
  }
};

export const handoffDB = {
  create(id, fromAgent, toAgent, task, context = {}) {
    return stmts.insertHandoff.run(
      id, fromAgent, toAgent, task,
      JSON.stringify(context)
    );
  },

  update(id, status, result = null) {
    return stmts.updateHandoff.run(status, result, id);
  },

  get(id) {
    const row = stmts.getHandoff.get(id);
    if (row && row.context) row.context = JSON.parse(row.context);
    return row;
  },

  getPending() {
    const rows = stmts.getPendingHandoffs.all();
    return rows.map(r => ({
      ...r,
      context: r.context ? JSON.parse(r.context) : {}
    }));
  },

  getAll(limit = 50) {
    const rows = stmts.getAllHandoffs.all(limit);
    return rows.map(r => ({
      ...r,
      context: r.context ? JSON.parse(r.context) : {}
    }));
  }
};

export const messageDB = {
  send(id, fromAgent, toAgent, content, type = 'message') {
    return stmts.insertAgentMessage.run(id, fromAgent, toAgent, content, type);
  },

  getFor(agentId, limit = 50) {
    return stmts.getMessagesFor.all(agentId, limit);
  },

  getUnread(agentId) {
    return stmts.getUnreadFor.all(agentId);
  },

  markRead(id) {
    return stmts.markRead.run(id);
  },

  getAllActivity(limit = 50) {
    return stmts.getAllActivity.all(limit);
  }
};

// User Settings API
export const settingsDB = {
  get(userId, agentId) {
    return stmts.getSettings.get(userId, agentId);
  },

  getAll(userId) {
    return stmts.getAllSettings.all(userId);
  },

  upsert(userId, agentId, settings) {
    return stmts.upsertSettings.run(
      userId, agentId,
      settings.model || null,
      settings.temperature ?? null,
      settings.maxTokens ?? null,
      settings.systemPrompt || null,
      settings.color || null,
      settings.icon || null,
      settings.displayOrder ?? null
    );
  },

  updateOrder(userId, agentOrders) {
    // agentOrders is array of { agentId, order }
    const tx = db.transaction(() => {
      for (const { agentId, order } of agentOrders) {
        stmts.updateAgentOrder.run(userId, agentId, order);
      }
    });
    tx();
  }
};

// Custom Agents API
export const customAgentsDB = {
  create(userId, agent) {
    const id = `custom_${generateId()}`;
    stmts.createCustomAgent.run(
      id, userId,
      agent.name,
      agent.icon || '🤖',
      agent.color || '#6366f1',
      agent.model,
      agent.systemPrompt,
      agent.temperature ?? 0.7,
      agent.maxTokens ?? 4096,
      agent.displayOrder ?? 999
    );
    return { id, ...agent };
  },

  getAll(userId) {
    return stmts.getCustomAgents.all(userId);
  },

  get(id) {
    return stmts.getCustomAgent.get(id);
  },

  update(id, updates) {
    stmts.updateCustomAgent.run(
      updates.name || null,
      updates.icon || null,
      updates.color || null,
      updates.model || null,
      updates.systemPrompt || null,
      updates.temperature ?? null,
      updates.maxTokens ?? null,
      updates.displayOrder ?? null,
      id
    );
    return stmts.getCustomAgent.get(id);
  },

  delete(id, userId) {
    return stmts.deleteCustomAgent.run(id, userId);
  }
};

// OpenClaw Queue API
export const openclawDB = {
  queue(conversationId, content) {
    const id = generateId();
    stmts.queueToOpenclaw.run(id, conversationId, content);
    return id;
  },

  getPending() {
    return stmts.getOpenclawPending.all();
  },

  complete(id, response) {
    stmts.updateOpenclawStatus.run('completed', response, id);
  },

  get(id) {
    return stmts.getOpenclawMessage.get(id);
  },

  setProcessing(id) {
    stmts.updateOpenclawStatus.run('processing', null, id);
  }
};

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default db;
