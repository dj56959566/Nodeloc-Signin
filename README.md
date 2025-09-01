## 使用方法：

✅ Secrets 需要设置

在仓库 Settings → Secrets and variables → Actions 添加：

 NODELOC_COOKIE_1="完整登录Cookie"

NODELOC_CSRF_1
 
 TG_BOT_TOKEN="你的TG机器人Token"
 
 TG_USER_ID="你的TG用户ID"


多个账号可以继续加 NODELOC_COOKIE_2 / NODELOC_CSRF_2 …

等待每天 9 点自动签到，或者手动触发。


这个版本保证：

CSRF 自动抓取，不需要手动更新

Cookie 必须有效（登录状态）

签到结果会推送到 TG
