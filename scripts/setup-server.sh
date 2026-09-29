#!/usr/bin/env bash
# 邻集 · 阿里云 ECS（Ubuntu 22.04）一键部署脚本
# 用法：在服务器上克隆仓库后，进入项目目录执行  bash scripts/setup-server.sh
set -euo pipefail

echo "==> 1/6 交换文件（防 2G 内存机器构建时 OOM）"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile || true
  sudo chmod 600 /swapfile || true
  sudo mkswap /swapfile || true
  sudo swapon /swapfile || true
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null || true
fi
swapon --show || true

echo "==> 2/6 Node.js 22 LTS + pm2"
if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
sudo npm i -g pm2@latest

echo "==> 3/6 依赖安装"
npm ci --include=dev

echo "==> 4/6 环境变量 + 数据库"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
  echo "已生成 .env（含随机 AUTH_SECRET）。如需接入 GLM，编辑 .env 填 LLM_API_KEY"
fi
npx prisma db push
npm run db:seed -- --force

echo "==> 5/6 构建"
npm run build

echo "==> 6/6 pm2 启动（开机自启）"
pm2 delete linji 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
(pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash) || true

IP=$(curl -s --max-time 5 ifconfig.me || echo '<你的公网IP>')
echo ""
echo "✅ 部署完成：http://$IP:3000"
echo "   演示账号：lin / 123456（README 有完整说明）"
