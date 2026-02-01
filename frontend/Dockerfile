# 重点人员档案监测系统 - 前端镜像
# 多阶段：Node 构建 -> nginx 托管静态资源
FROM node:20-alpine AS builder
WORKDIR /app

# 依赖先安装（利用层缓存）
COPY package.json package-lock.json ./

# 构建
COPY . .
RUN ls
RUN npm install --legacy-peer-deps
RUN npm run build

# 运行阶段：nginx 托管 dist（base: /littlesmall/）
FROM nginx

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# 使用内置默认配置的替代，支持 /littlesmall/ 与 /littlesmall/api 代理
COPY docker/nginx-default.conf /etc/nginx/conf.d/default.conf

# 将构建产物放入 nginx 根目录（Vite base 为 /littlesmall/，产出在 dist/littlesmall/）
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

USER nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]
