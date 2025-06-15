# MCP Setup Guide for Zynlo Helpdesk

## 🚨 Immediate Security Action Required

**Your Supabase access token was exposed!** Please:

1. Go to your Supabase dashboard
2. Revoke the token: `sbp_eac9c580ff96d79eb1e0046656792174efbe4c0d`
3. Generate a new access token
4. Never commit tokens to git

## 📋 Steps to Fix MCP

### 1. Update Your Tokens

Replace the placeholder values in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_NEW_SUPABASE_ACCESS_TOKEN"
      }
    },
    "task-master": {
      "command": "cmd",
      "args": ["/c", "npx", "task-master-ai", "mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY",
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY"
      }
    }
  }
}
```

### 2. Get Your Supabase Access Token

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Account Settings → Access Tokens
3. Create a new personal access token
4. Copy and replace `YOUR_NEW_SUPABASE_ACCESS_TOKEN`

### 3. Get API Keys for Task Master (Optional)

Task Master supports multiple AI providers. You need at least one:

- **Anthropic**: Get key from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Get key from [platform.openai.com](https://platform.openai.com)
- **Perplexity**: Get key from [perplexity.ai](https://perplexity.ai)

### 4. Restart Cursor

**Important**: After updating `.cursor/mcp.json`, you must:

1. Close Cursor completely
2. Open Cursor again
3. The MCP servers should start automatically

### 5. Verify MCP is Working

In Cursor, you should see:

- MCP tools available in the tool picker
- Supabase commands like database queries
- Task Master commands if configured

## 🔧 Troubleshooting

### If MCP Still Doesn't Work:

1. **Check the Output Panel**:

   - View → Output
   - Select "MCP" from dropdown
   - Look for error messages

2. **Common Issues**:

   - **"command not found"**: Ensure Node.js is in PATH
   - **"unauthorized"**: Token is invalid or expired
   - **"ECONNREFUSED"**: Network/firewall issues

3. **Windows Specific**:

   - Try using PowerShell instead:
     ```json
     "command": "powershell",
     "args": ["-Command", "npx -y @supabase/mcp-server-supabase@latest"]
     ```

4. **Check npx Works**:
   ```cmd
   npx --version
   ```
   If this fails, reinstall Node.js

### Alternative: Direct Path

If npx issues persist, install globally and use direct path:

```cmd
npm install -g @supabase/mcp-server-supabase
npm install -g task-master-ai
```

Then update mcp.json:

```json
"command": "supabase-mcp-server"
```

## 📝 Best Practices

1. **Never commit `.cursor/mcp.json`** with real tokens
2. Add to `.gitignore`:

   ```
   .cursor/mcp.json
   ```

3. **Use environment variables** where possible
4. **Rotate tokens regularly**
5. **Monitor access logs** in Supabase

## 🎯 Next Steps

Once MCP is working:

1. Test Supabase queries through MCP
2. Initialize Task Master: `task-master init`
3. Parse your PRD: `task-master parse-prd`
4. Start using AI-powered task management

Need help? Check:

- Cursor MCP docs
- Supabase MCP server repo
- Task Master documentation
