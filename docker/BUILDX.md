# Docker Buildx 使用说明

## 当前状态

- **Buildx 已安装**：`docker buildx version` → v0.30.1
- **默认 builder**（`default`）：仅支持 **linux/arm64**，可直接用于本机单架构构建
- **多架构 builder**（`multiarch`）：已创建，用于同时构建 amd64 + arm64；若未启动，见下方「多架构构建」

## 常用命令

```bash
# 查看已安装的 builders
docker buildx ls

# 使用默认 builder（仅当前架构，本机跑 compose 足够）
docker buildx use default

# 使用多架构 builder（需先完成下面的「多架构构建」启动）
docker buildx use multiarch
```

## 多架构构建（arm64 + amd64）

需要先让 `multiarch` 这个 builder 里的 BuildKit 跑起来：

```bash
docker buildx use multiarch
docker buildx inspect --bootstrap
```

若出现 **proxy 错误**（例如 `dial tcp 127.0.0.1:7890: connection refused`）：
- 当前 Docker 的代理在 **systemd** 里：`/etc/systemd/system/docker.service.d/10_docker_proxy.conf`（`HTTP_PROXY`/`HTTPS_PROXY=127.0.0.1:7890`）
- 可选做法：
  1. **先开代理**：确保 127.0.0.1:7890 已启动（本机代理/VPN），再执行 `docker buildx inspect --bootstrap`
  2. **临时关代理**：编辑该文件，注释或删掉代理行，然后 `sudo systemctl restart docker`，再执行上述三条命令；用完后如需代理可改回并再次 `restart docker`

启动成功后，执行项目里的多架构构建脚本即可：

```bash
./build-multiarch.sh              # 构建双架构并加载当前架构到本地
IMAGE_REGISTRY=你的仓库 ./build-multiarch.sh push   # 构建并推送
```

## 仅本机使用（不搞多架构、不启用 multiarch）

多架构 builder 未就绪时，只构建当前架构即可：

```bash
docker buildx use default
docker compose build backend frontend
docker compose up -d
```

---

## 拉取基础镜像超时（dial tcp ... i/o timeout）

构建时若报错 `failed to resolve source metadata for docker.io/... dial tcp ...:443: i/o timeout`，而命令行里 **docker pull** 能成功，多半是当前用了 **buildx 的 docker-container builder**（如 multiarch），构建在独立容器里跑，不会走守护进程的代理。

**先切回默认 builder 再构建：**
```bash
docker buildx use default
docker compose build
# 或 docker-compose up -d --build
```

若仍超时，再按下面两种方式之一处理：

### 方式一：使用代理（VPN / 本机代理）

1. 先启动你的 VPN 或本机代理（如 127.0.0.1:7890）。
2. 把本项目提供的示例配置安装为 Docker 的 systemd 配置：
   ```bash
   cd /home/administrator/code/star-archive/docker
   sudo mkdir -p /etc/systemd/system/docker.service.d
   sudo cp docker-service-proxy.conf.sample /etc/systemd/system/docker.service.d/http-proxy.conf
   ```
   若代理地址不是 `127.0.0.1:7890`，编辑 `http-proxy.conf` 修改为你的代理地址。
3. 重载并重启 Docker：
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```
4. 再执行 `docker compose build` 或 `./build-multiarch.sh`。

### 方式二：配置 Docker Hub 镜像加速（无需代理时）

编辑 `/etc/docker/daemon.json`（若不存在则新建），增加 `registry-mirrors`，例如：

```json
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io"
  ]
}
```

保存后执行 `sudo systemctl restart docker`，再执行 `docker compose build`。镜像站列表可随地域与可用性自行更换。
