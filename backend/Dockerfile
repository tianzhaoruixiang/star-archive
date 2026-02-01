# 重点人员档案监测系统 - 后端镜像
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
RUN apk add --no-cache dumb-init
WORKDIR /app

# 从构建阶段复制 jar（Spring Boot 打出 fat jar）
COPY --from=builder /build/target/person-monitor-*.jar ./app.jar

# 默认端口与 context-path 与 application.yml 一致
ENV SERVER_PORT=8000
EXPOSE 8000

USER 1000:1000
ENTRYPOINT ["dumb-init", "--", "java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
