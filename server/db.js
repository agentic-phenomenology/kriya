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

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default db;
