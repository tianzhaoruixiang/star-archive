# 人员档案 - 前端镜像
# 多阶段：Node 构建 -> nginx 托管静态资源
FROM node:20-alpine AS builder
WORKDIR /app

# 依赖先安装（利用层缓存）
COPY package.json package-lock.json ./

RUN npm install --legacy-peer-dep

# 构建
COPY . .

RUN npm run build

# 运行阶段：nginx 托管 dist（base: /littlesmall/）
FROM nginx

# 1. 删除主配置中的默认 pid 指令，防止冲突
RUN sed -i '/pid/d' /etc/nginx/nginx.conf && \
    # 2. 确保 nginx 用户对必要的目录有读写权限
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx /usr/share/nginx/html

# 3. 覆盖主配置文件 (确保该文件内部没有重复的 pid 指令)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# 将构建产物放入 nginx 根目录（Vite base 为 /littlesmall/，产出在 dist/littlesmall/）
COPY --from=builder /app/dist /usr/share/nginx/html/littlesmall

EXPOSE 80
USER nginx
# 4. 在启动时统一指定 PID 存放在有权限的 /tmp 目录
ENTRYPOINT ["nginx", "-g", "daemon off;"]