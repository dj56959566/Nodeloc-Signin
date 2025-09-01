## 使用方法：

在 GitHub 仓库 → Settings → Secrets and variables → Actions 添加：

NODELOC_COOKIE（完整 cookie）

NODELOC_CSRF（x-csrf-token）

TG_BOT_TOKEN
TG_CHAT_ID
把 sign_in.py 和 .github/workflows/nodeloc.yml 提交到仓库。

等待每天 9 点自动签到，或者手动触发。
