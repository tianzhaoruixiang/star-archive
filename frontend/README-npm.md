# 安装 npm 依赖

当前本机已安装 **Node.js**（`/usr/bin/node`），但未检测到 **npm**。按下面步骤安装后即可在 frontend 下执行 `npm install`。

## 1. 安装 npm（需本机执行一次）

在终端中执行（会提示输入密码）：

```bash
sudo apt-get update
sudo apt-get install -y npm
```

安装完成后验证：

```bash
node -v   # 应显示 v18.x
npm -v    # 应显示 10.x 或 9.x
```

## 2. 安装本项目前端依赖

在项目根目录或 frontend 目录执行：

```bash
cd /home/administrator/code/star-archive/frontend
npm install
```

## 3. 可选：用 NodeSource 安装较新 Node（含 npm）

若希望使用更新版本的 Node.js（如 20 LTS），可改用 NodeSource 安装后再执行 `npm install`：

```bash
# 安装 Node.js 20.x（含 npm）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
cd /home/administrator/code/star-archive/frontend
npm install
```

安装完成后，在 frontend 目录可正常使用：

- `npm run dev` — 启动开发服务器
- `npm run build` — 构建生产包
- `npm run lint` — 代码检查
