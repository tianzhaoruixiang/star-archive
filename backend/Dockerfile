# 人员档案 - 后端镜像
# 多阶段：Maven 构建 -> OpenJDK 21 运行
FROM hackyo/maven:3.9-jdk-21 AS builder
WORKDIR /build

# 复制 POM 并下载依赖（利用层缓存）
COPY pom.xml .
RUN mvn dependency:go-offline -B -q || true

# 复制源码并打包（跳过测试以加快镜像构建）
COPY src ./src
RUN mvn package -DskipTests

# 运行阶段
FROM eclipse-temurin:21-jre-alpine
USER root

RUN apk add --no-cache dumb-init su-exec
WORKDIR /app
RUN mkdir -p /app/logs /config
RUN chmod 777 /app/logs
RUN touch /app/logs/application.log
RUN touch /app/logs/application-error.log

# 从构建阶段复制 jar（Spring Boot 打出 fat jar）
COPY --from=builder /build/target/person-monitor-*.jar ./app.jar

# 将配置文件和 JSON Schema 放在 jar 包外部（/config），便于通过挂载目录覆盖
COPY application.yml /config/application.yml
COPY person-schema.json /config/person-schema.json

# 启动脚本：挂载卷时 /app/logs 可能属 root，先 chown 再以 UID 1000 运行 Java
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# 默认端口与 context-path 与 application.yml 一致
ENV SERVER_PORT=8000
EXPOSE 8000

# 日志写入 /app/logs，避免写入 /app 导致 Permission denied（容器以非 root 用户运行）
ENV LOGGING_FILE_PATH=/app/logs

# 以 root 启动 dumb-init + entrypoint，entrypoint 内 chown /app/logs 后 su-exec 1000 运行 Java
USER root
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
