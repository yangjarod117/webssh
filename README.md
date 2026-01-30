# Nginx 反向代理项目

基于 Docker Compose 的高性能 Nginx 反向代理解决方案，针对国内用户访问优化，配合 Cloudflare CDN 使用。

## 项目特性

- 🚀 高性能配置（4核8G AMD EPYC 优化）
- 🌏 针对国内用户访问优化
- 🔒 完整的安全头配置
- 📊 结构化日志记录
- 🔄 自动重启和日志轮转
- 🌐 WebSocket 支持
- 🛡️ 智能限流策略
- 📦 Docker 容器化部署

## 快速开始

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd nginx-proxy
```

### 2. 创建必要目录
```bash
./scripts/setup.sh
```

### 3. 配置站点
复制示例配置并修改：
```bash
cp conf.d/example.conf conf.d/your-site.conf
```

### 4. 启动服务
```bash
docker-compose up -d
```

## 目录结构

```
.
├── compose.yml          # Docker Compose 配置
├── nginx.conf          # Nginx 主配置文件
├── conf.d/             # 站点配置目录
├── ssl/                # SSL 证书目录
├── html/               # 静态文件目录
├── logs/               # 日志目录
├── modules/            # Nginx 模块目录
└── scripts/            # 部署脚本
```

## 配置说明

### 性能优化
- 4 个 worker 进程
- 16384 连接数/进程
- 启用 epoll 和 multi_accept
- 优化的缓冲区设置

### 安全配置
- 最新的 Cloudflare IP 范围
- 完整的安全头
- TLS 1.3/1.2 支持
- 智能限流策略

### 缓存策略
- 静态资源长期缓存
- 配合 Cloudflare CDN
- 反向代理缓存

## 使用指南

详见 [docs/](docs/) 目录下的文档。

## 许可证

MIT License