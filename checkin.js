const axios = require("axios");

// TG 推送
async function sendTG(message) {
  const TG_TOKEN = process.env.TG_BOT_TOKEN;
  const TG_USER_ID = process.env.TG_USER_ID;
  if (!TG_TOKEN || !TG_USER_ID) return;

  try {
    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      chat_id: TG_USER_ID,
      text: message,
      parse_mode: "Markdown"
    });
    console.log("✅ TG 推送成功");
  } catch (err) {
    console.log("❌ TG 推送失败：", err.message);
  }
}

// 获取最新 CSRF
async function fetchCSRF(COOKIE) {
  try {
    const res = await axios.get("https://www.nodeloc.com/latest", {
      headers: {
        "user-agent": "Mozilla/5.0",
        "cookie": COOKIE,
        "referer": "https://www.nodeloc.com/latest"
      }
    });
    const match = res.data.match(/name="csrf-token" content="([^"]+)"/);
    if (match) return match[1];
    console.log("❌ 未找到 CSRF token");
    return null;
  } catch (err) {
    console.log("❌ 获取 CSRF 失败：", err.message);
    return null;
  }
}

// 单账号签到
async function checkin(COOKIE, alias) {
  if (!COOKIE) {
    const msg = `[${alias}] ❌ Cookie 未设置`;
    console.log(msg);
    await sendTG(msg);
    return;
  }

  // 随机延迟 1~3 秒
  await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));

  const CSRF = await fetchCSRF(COOKIE);
  if (!CSRF) {
    const msg = `[${alias}] ❌ 获取 CSRF 失败`;
    console.log(msg);
    await sendTG(msg);
    return;
  }

  try {
    const res = await axios.post("https://www.nodeloc.com/checkin", {}, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "cookie": COOKIE,
        "referer": "https://www.nodeloc.com/latest",
        "origin": "https://www.nodeloc.com",
        "x-csrf-token": CSRF,
        "x-requested-with": "XMLHttpRequest"
      }
    });

    const data = res.data;
    let msg = `[${alias}] 签到返回：\n${JSON.stringify(data)}`;
    console.log(msg);
    await sendTG(msg);

  } catch (err) {
    const msg = `[${alias}] ❌ 请求失败：${err.message}`;
    console.log(msg);
    await sendTG(msg);
  }
}

// 主程序
(async () => {
  const COOKIE = process.env.NODELOC_COOKIE_1;
  if (!COOKIE) return console.log("⚠️ 请设置 NODELOC_COOKIE_1");

  await checkin(COOKIE, "账号1");
})();
