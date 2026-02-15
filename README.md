# Agent Workspace

A multi-agent chat interface for orchestrating multiple AI agents simultaneously. Each agent has a distinct role, personality, and system prompt. Agents can communicate with each other through handoffs, direct messages, and broadcasts.

Built with React 19 + Vite (frontend) and Express (backend), powered by OpenRouter or DashScope LLM APIs with real-time streaming.

![Agent Workspace Screenshot](docs/screenshot.png)

## Features

- **Multi-pane chat layout** — Open multiple agent conversations side-by-side in grid, column, or row layouts
- **10 specialized agents** — Research, Writer, Code, Security, Data, Deploy, Design, QA, Calendar, and Overview
- **Real-time streaming** — Server-Sent Events for live token-by-token responses from LLM APIs
- **Inter-agent communication** — Agents can hand off tasks, message each other, and broadcast to all
- **Overview agent** — Orchestration agent that monitors all other agents and tracks system state
- **Session authentication** — Login-protected with configurable credentials
- **Collapsible sidebar** — Filter agents by group (Analysis, Engineering, Creative, Coordination)
- **Dark mode UI** — Sleek interface designed for extended use

## Architecture

```
┌─────────────────────────────────────────┐
│         Agent Workspace (React)         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │Research │ │  Code  │ │Overview│ ...  │
│  │  Agent  │ │ Agent  │ │ Agent  │      │
│  └───┬────┘ └───┬────┘ └───┬────┘      │
│      └──────────┴──────────┘            │
│               │ HTTP/SSE                │
└───────────────┼─────────────────────────┘
                ▼
┌──────────────────────────────┐
│    Express Backend (:3001)   │
│  • Session auth              │
│  • Agent config              │
│  • Inter-agent message bus   │
│  • SSE streaming proxy       │
└───────────────┬──────────────┘
                │ /v1/chat/completions
                ▼
┌──────────────────────────────┐
│   LLM Provider               │
│   OpenRouter / DashScope     │
└──────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- An API key from [OpenRouter](https://openrouter.ai/keys) or [DashScope](https://dashscope.console.aliyun.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/benjaminbratton/agent-workspace.git
cd agent-workspace

# Create your .env file from the template
cp .env.example .env
# Edit .env with your API key and credentials

# Option 1: Use the start script
./start.sh

# Option 2: Start manually (two terminals)
# Terminal 1 — Backend
cd server && npm install && npm start

# Terminal 2 — Frontend
npm install && npm run dev
```

Then visit `http://localhost:5173` and log in with the credentials you set in `.env`.

## Agent System

### Agent Roles

| Agent | Group | Role |
|-------|-------|------|
| Research | Analysis | Academic research and synthesis |
| Data | Analysis | Statistical analysis and data patterns |
| Code | Engineering | Software implementation |
| Security | Engineering | Vulnerability assessment and risk |
| Deploy | Engineering | DevOps and infrastructure |
| QA | Engineering | Quality assurance and testing |
| Writer | Creative | Prose drafting and editing |
| Design | Creative | UI/UX design |
| Calendar | Coordination | Scheduling and human coordination |
| Overview | Coordination | System orchestration and monitoring |

### Inter-Agent Communication

Agents can communicate using patterns detected in their responses:

- `[HANDOFF:agentId]` — Formal task transfer with context
- `[MSG:agentId]` — Direct message or question to another agent
- `[BROADCAST]` — Message to all agents

The Overview agent receives injected system state (all agent activity, pending handoffs, message history) to serve as a control tower.

## Project Structure

```
agent-workspace/
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Main workspace component
│   └── components/
│       ├── ChatPane.jsx          # Individual agent chat pane
│       ├── LoginScreen.jsx       # Authentication screen
│       ├── Sidebar.jsx           # Agent list and layout controls
│       └── StatusDot.jsx         # Agent status indicator
├── server/
│   ├── index.js                  # Express API server
│   ├── agents.config.json        # Agent definitions and system prompts
│   └── package.json
├── .env.example                  # Environment variable template
├── start.sh                      # Launch script for both servers
├── package.json
└── vite.config.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/status` | Check auth state |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get single agent |
| PATCH | `/api/agents/:id` | Update agent model/settings |
| POST | `/api/chat` | Send message (SSE streaming) |
| GET | `/api/conversations/:agentId` | Get chat history |
| DELETE | `/api/conversations/:agentId` | Clear conversation |
| POST | `/api/agents/:fromId/send` | Inter-agent message |
| POST | `/api/handoffs` | Create task handoff |
| PATCH | `/api/handoffs/:id` | Update handoff status |
| GET | `/api/handoffs` | List handoffs |
| GET | `/api/agents/:id/inbox` | Agent inbox |
| GET | `/api/activity` | Inter-agent activity log |
| GET | `/api/overview` | Full system state summary |
| GET | `/api/models` | Available models from OpenRouter |

## Current Limitations

- **In-memory storage** — Conversations and agent bus data are lost on server restart
- **No persistence** — Would need SQLite or similar for production use
- **No handoff UI** — Inter-agent handoffs are tracked server-side but not yet surfaced in the frontend

## License

MIT
