# 🚀 Telegram Notification Setup Guide

This document explains how to configure, test, and maintain the real-time admin alert system for SpareOps.

## 1. Prerequisites
- A Telegram account.
- Access to the `server/.env` file.

## 2. Bot Creation & Configuration
1. **Create the Bot:**
   - Open Telegram and search for **@BotFather**.
   - Send `/newbot` and follow the instructions to get your **Bot Token**.
2. **Get the Group Chat ID:**
   - Create a Telegram Group for your admins.
   - Add your bot to the group and make it an **Administrator**.
   - Add **@IDBot** to the group and type `/id`.
   - Copy the ID (it must start with a minus, e.g., `-5199341765`).
3. **Update Environment Variables:**
   Edit `server/.env` and add:
   ```env
   TELEGRAM_BOT_TOKEN="your_bot_token"
   TELEGRAM_ADMIN_CHAT_ID="-your_group_id"
   ```

## 3. Network Compatibility (Node.js)
The system is optimized for environments where IPv6 might be unstable.
- **Force IPv4:** The server is configured to prioritize IPv4 to avoid `AggregateError` or `Network is unreachable` messages.
- **Scripts:** Always start the server using `npm run dev` or `npm start`, as these commands now include the necessary `--dns-result-order=ipv4first` flag in `package.json`.

## 4. Testing the Feature
To verify the system is working without manually creating a real request, you can use these methods:

### Method A: Console Test (Fastest)
Run this command from your server terminal to send a direct test message:
```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage \
     -H "Content-Type: application/json" \
     -d '{"chat_id": "<YOUR_CHAT_ID>", "text": "🔔 <b>Test Alert</b>", "parse_mode": "HTML"}'
```

### Method B: Application Test
1. Login to the SpareOps Frontend as a **Sales** user.
2. **Test Requisition:** Create a "New Request." Check the Telegram group for a message listing the item names and quantities.
3. **Test Deployment:** Log a "New Usage/Deployment." Check the Telegram group for the shop name and part details.

## 5. Reliability Features
- **Non-Blocking:** Telegram alerts run in the background. If Telegram is slow or down, the user's request will still be saved instantly.
- **Internal Error Handling:** Errors are caught and logged to `server/logs/error.log` instead of crashing the server.
- **Zero Dependencies:** Uses the native Node.js `https` module for maximum performance and security.

## 6. Troubleshooting
| Error in `error.log` | Meaning | Fix |
| :--- | :--- | :--- |
| `Telegram API error [401]` | Unauthorized | Your Bot Token is incorrect or was revoked. |
| `Telegram API error [400]` | Bad Request | The Chat ID is wrong or the bot isn't in the group. |
| `Network Error: ETIMEDOUT` | Connection Issue | Check server internet or firewall settings. |
| `AggregateError` | IPv6/DNS Issue | Ensure you are starting the server with `npm run dev`. |
