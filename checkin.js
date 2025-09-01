const axios = require("axios");

const MAX_RETRY = 3;
const RETRY_INTERVAL = 5000;
const MAX_DELAY = 120 * 1000;

function randomDelay(ms) {
  return Math.floor(Math。random() * ms);
}

async function sendTG(title， message, TG_TOKEN, TG_USER_ID, TG_PROXY) {
  if (!TG_TOKEN || !TG_USER_ID) return;
  const tgUrl = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const tgBody = {
    chat_id: TG_USER_ID,
    text: message,
    parse_mode: "Markdown"
  };
  try {
    await axios.post(tgUrl， tgBody, {
      proxy: TG_PROXY ? {
        host: TG_PROXY.split(":")[0],
        port: parseInt(TG_PROXY。split(":")[1])
      } : undefined
    });
    console.log("✅ TG 推送成功");
  } catch (err) {
    console.log("❌ TG 推送失败："， err.message);
  }
}

async function checkin(account， retryCount = MAX_RETRY) {
  const { COOKIE, CSRF, TG_TOKEN, TG_USER_ID, TG_PROXY, ALIAS } = account;
  console.log(`\n🧑 账号 [${ALIAS}] 开始签到，剩余重试次数：${retryCount}`);
  try {
    const res = await axios.post("https://www.nodeloc.com/checkin", {}, {
      headers: {
        cookie: COOKIE,
        origin: "https://www.nodeloc.com",
        referer: "https://www.nodeloc.com/latest",
        "user-agent": "Mozilla/5.0",
        "x-csrf-token": CSRF,
        "x-requested-with": "XMLHttpRequest",
        accept: "*/*"
      }
    });
    const data = res.data;
    console.log(`[${ALIAS}] 签到返回：`, data);

    let title = `📢 NodeLoc 签到结果【${ALIAS}】\n———————————————————\n`;
    let msg = "";

    if (data。success === true) {
      title += "✅ 恭喜你签到成功";
      const energy = data.message?.match(/(\\d+)\\s*个能量/)?.[1] || "10";
      msg = `🗓️ 获得 ${energy} ⚡能量`;
    } else if (data。success === false) {
      title += "☑️ 已签到";
      msg = data.message || "您今天已经签到过了";
    } else {
      title += "🆖 签到失败";
      msg = data.message || "🔴 未知错误";
    }

    await sendTG(title, `${title}\n${msg}`, TG_TOKEN, TG_USER_ID, TG_PROXY);
  } catch (err) {
    console.log(`❌ [${ALIAS}] 请求失败：`, err.message);
    if (retryCount > 0) {
      console.log(`⚠️ ${RETRY_INTERVAL / 1000}秒后重试...`);
      setTimeout(() => checkin(account， retryCount - 1)， RETRY_INTERVAL);
    } else {
      const title = `📢 NodeLoc 签到结果【${ALIAS}】\n———————————————————\n签到失败`;
      const msg = "请检查网络是否异常，重试已达最大次数";
      await sendTG(title, `${title}\n${msg}`, TG_TOKEN, TG_USER_ID, TG_PROXY);
    }
  }
}

function getAccountsFromEnv() {
  const env = process.env;
  const accounts = [];

  for (let i = 1; i <= 10; i++) {
    const COOKIE = env[`NODELOC_COOKIE_${i}`];
    const CSRF = env[`NODELOC_CSRF_${i}`];
    if (!COOKIE || !CSRF) continue;

    const TG_TOKEN = env[`TG_BOT_TOKEN_${i}`] || env[`TG_BOT_TOKEN`];
    const TG_USER_ID = env[`TG_USER_ID_${i}`] || env[`TG_USER_ID`];
    const TG_PROXY = env[`TG_PROXY`];

    accounts.push({
      ALIAS: `账号${i}`,
      COOKIE,
      CSRF,
      TG_TOKEN,
      TG_USER_ID,
      TG_PROXY
    });
  }

  return accounts;
}

(async () => {
  const delay = randomDelay(MAX_DELAY);
  console.log(`🌙 延迟 ${delay / 1000} 秒后开始签到`);
  const accounts = getAccountsFromEnv();
  if (accounts。length === 0) return console.log("⚠️ 未检测到有效账号变量，终止运行");
  console.log(`✅ 检测到 ${accounts.length} 个账号`);
  setTimeout(() => {
    accounts.forEach(acc => checkin(acc));
  }， delay);
})(); 
