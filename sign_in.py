import os
import time
import random
import requests

# 从 GitHub Secrets 读取
COOKIE = os.getenv("NODELOC_COOKIE")
CSRF_TOKEN = os.getenv("NODELOC_CSRF")

# 签到接口（通常是 /session 或 /checkin 之类，需确认实际接口）
CHECKIN_URL = "https://www.nodeloc.com/user/checkin"

# 公共请求头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "Referer": "https://www.nodeloc.com/",
    "Cookie": COOKIE,
    "X-CSRF-Token": CSRF_TOKEN,
    "X-Requested-With": "XMLHttpRequest",
}


def sign_in(max_retries=3):
    """执行签到，带重试"""
    for attempt in range(1, max_retries + 1):
        try:
            # 随机延迟，避免太像机器人
            delay = random.uniform(3, 10)
            print(f"⏳ 等待 {delay:.2f} 秒后开始签到...")
            time.sleep(delay)

            resp = requests.post(CHECKIN_URL, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                print("✅ 签到成功:", resp.text)
                return True
            else:
                print(f"⚠️ 请求失败 (状态码 {resp.status_code}): {resp.text}")
        except Exception as e:
            print(f"❌ 第 {attempt} 次请求出错: {e}")

        # 重试前随机等待
        if attempt < max_retries:
            wait_time = random.uniform(5, 15)
            print(f"🔄 {wait_time:.1f} 秒后重试...")
            time.sleep(wait_time)

    print("❌ 全部重试失败")
    return False


if __name__ == "__main__":
    sign_in()
