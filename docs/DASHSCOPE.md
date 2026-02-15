# DashScope Setup (Direct Alibaba Cloud Qwen Access)

Direct access to the latest Qwen models via Alibaba Cloud's DashScope API.

## Why Use DashScope?

- **Newest models** — Access unreleased/beta Qwen models before they hit OpenRouter
- **Lower latency** — Direct API, no middleman
- **Better pricing** — Often cheaper than aggregators
- **QwQ access** — Alibaba's reasoning model (like o1)

## Setup

### 1. Create Alibaba Cloud Account

Go to: https://dashscope.console.aliyun.com/

**Login options:**
- WeChat scan (fastest if you have WeChat)
- Alipay
- Phone number
- Email

### 2. Get API Key

1. Go to Console → API-KEY Management
2. Click "Create API Key"
3. Copy the key (starts with `sk-`)

### 3. Configure Agent Workspace

Add to your environment or `.env` file:

```bash
DASHSCOPE_API_KEY=sk-your-key-here
```

### 4. Switch Agents to DashScope

In `server/agents.config.json`, add `"provider": "dashscope"` to any agent:

```json
{
  "research": {
    "id": "research",
    "name": "Research Agent",
    "provider": "dashscope",
    "model": "qwen-max",
    ...
  }
}
```

## Available Models

| Model ID | Description |
|----------|-------------|
| `qwen-max` | Flagship, best quality |
| `qwen-plus` | Balanced speed/quality |
| `qwen-turbo` | Fast, cheaper |
| `qwen-coder` | Code specialist |
| `qwen-vl` | Vision + language |
| `qwq` | Reasoning model (like o1) |

## Hybrid Setup

You can mix providers — some agents on OpenRouter, some on DashScope:

```json
{
  "research": { "provider": "dashscope", "model": "qwq" },
  "code": { "provider": "dashscope", "model": "qwen-coder" },
  "writer": { "provider": "openrouter", "model": "anthropic/claude-3.5-sonnet" }
}
```

## Pricing

DashScope uses pay-as-you-go. Check current rates at:
https://help.aliyun.com/zh/model-studio/billing/

Free tier includes some initial credits.

## Troubleshooting

**"DashScope API key not configured"**
→ Set `DASHSCOPE_API_KEY` environment variable

**"Model not found"**
→ Check model name matches DashScope naming (e.g., `qwen-max` not `qwen/qwen-max`)

**Auth errors**
→ Verify API key is active in DashScope console
