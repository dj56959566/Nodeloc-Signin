const axios = require("axios");

const MAX_RETRY = 3;
const RETRY_INTERVAL = 5000;
const MAX_DELAY = 120 * 1000;

function randomDelay(ms) {
  return Math.floor(Math.random() * ms);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 随机 User-Agent
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 获取最新 CSRF
async function fetchCSRF(cookie) {
  try {
    const res = await axios.get("https://www.nodeloc.com/latest", {
      headers: {
        "user-agent": getRandomUA(),
        cookie,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        connection: "keep-alive"
      }
    });
    const match = res.data.match(/name="csrf-token" content="([a-zA-Z0-9]+)"/);
    if (match) return match[1];
    return null;
  } catch (err) {
    console.log("❌ 获取 CSRF 失败：", err.message);
    return null;
  }
}

// Telegram 推送函数
async function sendTG(title, message, TG_TOKEN, TG_USER_ID, TG_PROXY) {
  if (!TG_TOKEN || !TG_USER_ID) return;
  const tgUrl = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const tgBody = { chat_id: TG_USER_ID, text: message, parse_mode: "Markdown" };

  try {
    const config = {};
    if (TG_PROXY) {
      const [host, port] = TG_PROXY.split(":");
      config.proxy = { host, port: parseInt(port) };
    }
    await axios.post(tgUrl, tgBody, config);
    console.log("✅ TG 推送成功");
  } catch (err) {
    console.log("❌ TG 推送失败：", err.message);
  }
}

// 单个账号签到
async function checkin(account, retryCount = MAX_RETRY) {
  const { COOKIE, TG_TOKEN, TG_USER_ID, TG_PROXY, ALIAS } = account;
  console.log(`\n🧑 账号 [${ALIAS}] 开始签到，剩余重试次数：${retryCount}`);

  // 自动抓取最新 CSRF
  const CSRF = await fetchCSRF(COOKIE);
  if (!CSRF) {
    console.log(`❌ [${ALIAS}] 获取 CSRF 失败，跳过签到`);
    return;
  }

  try {
    const headers = {
      "user-agent": getRandomUA(),
      "cookie": COOKIE,
      "origin": "https://www.nodeloc.com",
      "referer": "https://www.nodeloc.com/latest",
      "x-csrf-token": CSRF,
      "x-requested-with": "XMLHttpRequest",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      "connection": "keep-alive"
    };

    const res = await axios.post("https://www.nodeloc.com/checkin", {}, { headers });
    const data = res.data;
    console.log(`[${ALIAS}] 签到返回：`, data);

    let title = `📢 NodeLoc 签到结果【${ALIAS}】\n———————————————————\n`;
    let msg = "";

    if (data.success === true) {
      title += "✅ 签到成功";
      const energy = data.message?.match(/(\d+)\s*个能量/)?.[1] || "10";
      const streak = data.message?.match(/连续签到\s*(\d+)天/)?.[1] || "-";
      msg = `🗓️ 获得能量：${energy} ⚡\n🔥 连续签到：${streak} 天`;
    } else if (data.success === false) {
      title += "☑️ 已签到";
      const streak = data.message?.match(/连续签到\s*(\d+)天/)?.[1] || "-";
      msg = `您今天已经签到过了\n🔥 连续签到：${streak} 天`;
    } else {
      title += "🆖 签到失败";
      msg = data.message || "🔴 未知错误";
    }

    await sendTG(title, `*${title}*\n${msg}`, TG_TOKEN, TG_USER_ID, TG_PROXY);

  } catch (err) {
    console.log(`❌ [${ALIAS}] 请求失败：`, err.message);
    if (retryCount > 0) {
      console.log(`⚠️ ${RETRY_INTERVAL / 1000} 秒后重试...`);
      await sleep(RETRY_INTERVAL);
      await checkin(account, retryCount - 1);
    } else {
      const title = `📢 NodeLoc 签到结果【${ALIAS}】\n———————————————————\n签到失败`;
      const msg = `请检查网络或COOKIE是否正确，错误信息：${err.message}`;
      await sendTG(title, `*${title}*\n${msg}`, TG_TOKEN, TG_USER_ID, TG_PROXY);
    }
  }
}

// 从环境变量获取账号信息
function getAccountsFromEnv() {
  const env = process.env;
  const accounts = [];

  for (let i = 1; i <= 10; i++) {
    const COOKIE = env[`NODELOC_COOKIE_${i}`];
    if (!COOKIE) continue;

    const TG_TOKEN = env[`TG_BOT_TOKEN_${i}`] || env[`TG_BOT_TOKEN`];
    const TG_USER_ID = env[`TG_USER_ID_${i}`] || env[`TG_USER_ID`];
    const TG_PROXY = env[`TG_PROXY`];

    accounts.push({ ALIAS: `账号${i}`, COOKIE, TG_TOKEN, TG_USER_ID, TG_PROXY });
  }

  return accounts;
}

// 主执行
(async () => {
  const delay = randomDelay(MAX_DELAY);
  console.log(`🌙 延迟 ${delay / 1000} 秒后开始签到`);
  await sleep(delay);

  const accounts = getAccountsFromEnv();
  if (accounts.length === 0) return console.log("⚠️ 未检测到有效账号变量，终止运行");
  console.log(`✅ 检测到 ${accounts.length} 个账号`);

  for (const acc of accounts) {
    await sleep(Math.floor(Math.random() * 2000) + 1000); // 每个账号随机延迟 1~3 秒
    await checkin(acc);
  }
})();
