import logger from "./logger";
import https from "https";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export const sendTelegramMessage = async (message: string) => {
  if (!BOT_TOKEN || !CHAT_ID) {
    logger.warn("Telegram BOT_TOKEN or CHAT_ID not set, skipping message.");
    return;
  }

  const data = JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "HTML",
  });

  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: "POST",
    family: 4, // Force IPv4 to avoid unreachable IPv6 networks
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          logger.error(`Telegram API error [${res.statusCode}]: ${responseBody}`);
          resolve(false);
        }
      });
    });

    req.on("error", (error: any) => {
      logger.error(`Telegram Network Error: ${error.message || error}`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
};
