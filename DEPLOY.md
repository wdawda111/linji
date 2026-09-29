# 邻集 · 部署指南（阿里云 ECS + GitHub）

> 目标：把本地运行的邻集部署到公网服务器，评委用浏览器直接访问 `http://<公网IP>:3000`。
> 技术决策：**保持 SQLite 不换数据库**——单文件零运维，ECS 磁盘天然持久，避免为演示引入云数据库的成本与迁移风险。

## 你需要准备

| 资源 | 用途 |
| --- | --- |
| 阿里云学生 300 代金券 | 抵扣 ECS 费用 |
| GitHub 账号（学生认证） | 托管代码；可选领免费 `.me` 域名 |
| 本仓库代码 | 已含全部部署脚本 |

## 第 1 步：代码推上 GitHub

```bash
# 本地（Windows）项目根目录
git add -A
git commit -m "feat: 邻集 - 小区闲置流转工具（含部署配置）"

# GitHub 上新建空仓库（如 linji），然后：
git remote add origin https://github.com/<你的用户名>/linji.git
git push -u origin master
```

## 第 2 步：购买阿里云 ECS（代金券抵扣）

控制台 → 云服务器 ECS → 创建实例，按这个配置选（学生性价比最高）：

- **实例**：经济型 e 或 u1，**2 vCPU + 2 GiB**（构建吃内存，脚本会自动开 2G swap 兜底）
- **镜像**：Ubuntu 22.04 64 位
- **计费**：包月（300 代金券可抵扣数月）或按量付费
- **安全组**：勾选开放 **22（SSH）** 和 **3000（网站访问）** 端口
- 创建后记下 **公网 IP**

> 也可以在阿里云「学生权益」页领专属学生机型（约 99 元/年 2c2g），代金券同样适用。

## 第 3 步：服务器一键部署

SSH 登录服务器后：

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/<你的用户名>/linji.git && cd linji
bash scripts/setup-server.sh
```

脚本自动完成：2G swap → Node 22 + pm2 → 依赖安装 → 生成 `.env`（随机 AUTH_SECRET）→ 建库+种子数据 → 生产构建 → pm2 启动并设置开机自启。

完成后浏览器打开 `http://<公网IP>:3000` 即为线上站点。**演示账号：lin / 123456**（还有 chenmama、laowang 等，见 README）。

## 第 4 步（可选）：域名 + HTTPS

1. GitHub Student Pack 里领免费 `.me` 域名（Namecheap），或阿里云注册个便宜域名并备案
2. DNS 解析 A 记录指向 ECS 公网 IP
3. 服务器装 nginx 反代 80 → 3000，certbot 一条命令上 HTTPS：

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/linji > /dev/null <<'NGINX'
server {
  listen 80;
  server_name 你的域名.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
NGINX
sudo ln -s /etc/nginx/sites-available/linji /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名.com
```

## 日常运维速查

```bash
pm2 status          # 运行状态
pm2 logs linji      # 日志
pm2 restart linji   # 重启
npm run db:seed -- --force   # 重置演示数据（会清空服务器上产生的数据）
```

## 更新代码后重新发布

本地改完推送 → 服务器上：

```bash
git pull && npm ci --include=dev && npx prisma db push && npm run build && pm2 restart linji
```

## 为什么不选 Vercel？

Vercel 部署最省事，但 Next 服务端渲染的站点在 Vercel 上是 Serverless 函数：**SQLite 文件系统不持久**（必须换 Turso/Neon 等云数据库，需要改代码迁移数据）；且 `*.vercel.app` 在国内访问不稳定，评委打不开就是硬伤。阿里云 ECS 国内访问快、SQLite 原样跑、300 代金券正好覆盖——是这套技术栈的最优解。
