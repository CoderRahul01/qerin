# Qerin Model Context Protocol (MCP) Server

The official Model Context Protocol (MCP) server for **Qerin** — enabling AI agents, Cursor, Claude Desktop, and Antigravity to autonomously access verified paywalled intelligence backed by on-chain cryptographic settlement proofs.

---

## 1. Quickstart

Run directly without installation:

```bash
npx -y @qerin/mcp@latest
```

---

## 2. Claude Desktop Integration

Add to your `claude_desktop_config.json`:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "qerin": {
      "command": "npx",
      "args": ["-y", "@qerin/mcp@latest"],
      "env": {
        "QERIN_API_KEY": "YOUR_QERIN_API_KEY"
      }
    }
  }
}
```

---

## 3. Cursor IDE Integration

In **Cursor Settings > Features > MCP**, click **+ Add New MCP Server**:

* **Name**: `qerin`
* **Type**: `command`
* **Command**: `npx -y @qerin/mcp@latest`

---

## 4. Antigravity IDE Integration

Add to your `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "qerin": {
      "command": "npx",
      "args": ["-y", "@qerin/mcp@latest"]
    }
  }
}
```

---

## 5. Available Tools

* **`qerin_verified_query`**: Queries paywalled data sources (CryptoSlate, Superhighway, Veles, CoinGecko, Messari) with on-chain settlement receipts.
* **`qerin_verify_receipt`**: Verifies any cryptographic transaction hash against the on-chain registry on Base or BOT Chain.
* **`qerin_list_sources`**: Returns live status, unit pricing, and coverage of active publisher feeds.

---

## 6. Multi-Chain Neutrality

Qerin settles cryptographic receipts natively across supported EVM networks:
* **Base Mainnet**: Chain ID `8453`, Registry `0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45`
* **BOT Chain Mainnet**: Chain ID `677`, Registry `0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45`
