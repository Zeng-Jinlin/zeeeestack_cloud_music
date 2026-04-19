# zeeeestack 云音乐

基于 Spring Boot + Kotlin 后端和 Vue3 前端的轻量个人音乐平台

***

## ✨ 核心特性

- **流式音频播放**：基于 X-Accel-Redirect，支持拖动进度条
- **临时 Token 鉴权**：10 分钟有效期，防止链接泄露
- **Nginx 静态资源分发**：后端零内存占用，高性能
- **无状态架构**：基于 Token 验证，支持水平扩展
- **多语言支持**：多国语言 + 部分中国少数民族语言

***

## 🛠️ 技术栈

### 后端

- **框架**：Spring Boot 3.2.0
- **语言**：Kotlin 1.9.20
- **JDK**：Java 17
- **构建工具**：Gradle 8.10
- **安全**：HMAC-SHA256 签名验证

### 前端

- **框架**：Vue 3.4.0
- **UI 库**：Quasar Framework 2.14.0
- **构建工具**：Vite 5.0.8
- **状态管理**：Pinia 2.1.7
- **国际化**：Vue I18n

### 基础设施

- **Web 服务器**：Nginx
- **音频格式**：MP3, WAV, FLAC, OGG, M4A, AAC
- **图片格式**：JPG, JPEG, PNG, WEBP

***

## 🏗️ 项目目录结构

```
zeeeestack_cloud_music/
├── backend/                    # Spring Boot + Kotlin 后端
│   ├── src/main/kotlin/
│   │   └── com/zeeeestack/music/
│   │       ├── controller/     # REST API
│   │       ├── service/        # 业务逻辑
│   │       ├── security/       # 安全验证
│   │       └── ratelimiter/    # 限流服务
│   └── src/main/resources/
│       ├── application.yml     # 开发环境配置
│       └── application-prod.yml.example  # 生产配置模板
│
├── frontend/                   # Vue3 前端
│   ├── src/
│   │   ├── components/         # Vue 组件
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── services/           # API 服务
│   │   └── i18n/               # 国际化
│   └── package.json
│
├── music/                      # 音乐文件目录（需手动创建）
│   ├── music-files/            # 音频文件
│   └── music-cover/            # 封面图片
│
├── .vscode/
│   └── tasks.json              # VSCode 任务配置
│
├── nginx.conf                  # 生产环境 Nginx 配置
├── nginx.dev.conf              # 开发环境 Nginx 配置
└── README.md
```

***

# 本地开发运行向导

## 前置条件

确保已安装以下软件：

| 软件       | 版本  | 说明                                                          |
| -------- | --- | ----------------------------------------------------------- |
| Java JDK | 17+ | [下载地址](https://www.oracle.com/java/technologies/downloads/) |
| Node.js  | 18+ | [下载地址](https://nodejs.org/)                                 |
| Nginx    | 最新  | [下载地址](http://nginx.org/en/download.html)                   |

**验证安装：**

```bash
java -version
node --version
npm --version
nginx -v
```

## 快速开始（5 分钟）

### 1. 准备音乐文件

在项目根目录创建 `music/` 文件夹：

```bash
mkdir music
mkdir music/music-files
mkdir music/music-cover
```

添加测试音乐文件到 `music/music-files/` 目录：

- 支持格式：MP3, WAV, FLAC, OGG, M4A, AAC
- 文件命名：`歌曲 ID.格式`（如：`CallBack.mp3`）

可选：添加封面图片到 `music/music-cover/` 目录：

- 支持格式：JPG, JPEG, PNG, WEBP
- 文件命名：与对应音乐文件名一致（如：`CallBack.jpg`）

### 2. 一键启动

使用 VSCode 任务一键启动所有服务：

1. 打开项目到 VSCode
2. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）
3. 输入 `Tasks: Run Task`
4. 选择 `Run All`

自动启动：

- ✅ 后端服务（端口 8080）
- ✅ 前端服务（端口 3000）
- ✅ Nginx 反向代理（端口 8081）

**访问地址：** <http://localhost:8081>

## 开发技巧

### 热重载

**前端：** Vite 默认开启热重载，修改代码后自动刷新

**后端：**

```bash
cd backend
./gradlew bootRun --continuous
```

### 调试

**后端日志：** 修改 `backend/src/main/resources/application.yml`

```yaml
logging:
  level:
    com.zeeeestack.music: DEBUG
```

**前端调试：** 浏览器开发者工具 → Console

### 常见问题

#### 端口被占用

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

#### Nginx 启动失败

```bash
# 检查配置
nginx -t -c /path/to/nginx.dev.conf

# 查看错误日志
tail -f logs/error.log
```

#### 音乐无法播放

1. 检查 `music/music-files/` 目录是否有音频文件
2. 查看后端日志，确认签名验证是否通过
3. 使用标准格式（推荐 MP3）

***

# 云端部署向导

## 默认服务器目录结构

```
/backend/music/cloud-music/spring/
└── cloud-music-backend.jar    # 应用程序

/frontend/music/cloud-music/
└── dist/                       # 前端构建产物

/music/
├── music-files/                # 音乐文件
├── music-cover/                # 封面图片
└── music-info/
    └── static-info.json        # 静态音乐信息文件

/etc/nginx/
├── nginx.conf      # Nginx 主配置文件
└── ssl/            # HTTPS 证书目录

/etc/systemd/system/
└── cloud-music.service    # Systemd 服务配置
```

## 后端部署

### 1. 安装 Java 17+

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install openjdk-17-jre-headless -y
```

**CentOS/RHEL:**

```bash
sudo yum install java-17-openjdk-headless -y
```

**验证安装：**

```bash
java -version
```

### 2. 本地构建应用

**Linux/Mac:**

```bash
cd backend
./gradlew build
```

**Windows PowerShell:**

```powershell
cd backend
.\gradlew.bat build
```

构建产物：`build/libs/cloud-music-backend.jar`

### 3. 配置生产环境

```bash
# 复制配置模板
cp backend/src/main/resources/application-prod.yml.example \
   backend/src/main/resources/application-prod.yml

# 编辑配置（根据需要修改）
vim backend/src/main/resources/application-prod.yml
```

### 4. 上传文件到服务器

```bash
# 上传 JAR 文件
scp build/libs/cloud-music-backend.jar user@server:/backend/music/cloud-music/spring/

# 上传配置文件
scp backend/src/main/resources/application-prod.yml user@server:/backend/music/cloud-music/spring/

# 上传音乐文件目录
scp -r ../music/ user@server:/
```

### 5. Systemd 服务配置

创建 `/etc/systemd/system/cloud-music.service`：

**普通配置（2GB+ 内存）：**

```ini
[Unit]
Description=Cloud Music Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/backend/music/cloud-music/spring
Environment="JAVA_OPTS=-Xms512m -Xmx1g"
ExecStart=/usr/bin/java $JAVA_OPTS -jar cloud-music-backend.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**低配配置（< 2GB 内存）：**

```ini
[Unit]
Description=Cloud Music Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/backend/music/cloud-music/spring
Environment="JAVA_OPTS=-Xms256m -Xmx512m -XX:+UseSerialGC"
ExecStart=/usr/bin/java $JAVA_OPTS -jar cloud-music-backend.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启动服务：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloud-music
sudo systemctl start cloud-music
```

### 6. 验证后端部署

```bash
curl http://localhost:8080/api/static-info
```

**正常输出示例：**

```json
{
  "songs": [
    {
      "songId": "CallBack",
      "songName": "CallBack",
      "duration": 395,
      "lastModified": 1748539301606
    }
  ]
}
```

**查看日志：**

```bash
# 查看 Systemd 服务日志
sudo journalctl -u cloud-music -f
```

## 前端部署

### 1. HTTPS 证书配置

将证书文件上传到服务器（公钥+私钥）：

- **目标路径**: `/frontend/music/cloud-music/ssl`

并确保在 nginx.conf 中正确配置了 https 证书文件路径。

### 2. 端口放行

需要开放 443 端口才能正常以 https 协议访问站点。

**CentOS / Rocky / Almalinux:**

```bash
# 开放 443 端口
sudo firewall-cmd --zone=public --add-port=443/tcp --permanent
sudo firewall-cmd --reload
```

**Ubuntu / Debian:**

```bash
# 开放 443 端口
sudo ufw allow 443/tcp
sudo ufw reload
```

**注意：** 部分云平台（阿里云/腾讯云/华为云/轻量应用服务器等），还需要手动在控制台添加放行 443 端口。

### 3. 构建生产版本

```bash
cd frontend
npm run build
```

构建产物位于 `frontend/dist/` 目录。

### 4. 部署到服务器

将 `frontend/dist/` 目录内容上传到服务器：

- **目标路径**: `/frontend/music/cloud-music/dist`

### 5. Nginx 配置

直接使用项目根目录的 `nginx.conf`：

```bash
# 复制配置文件（建议先备份）
sudo cp nginx.conf /etc/nginx/nginx.conf

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 6. 验证部署

访问你的域名，检查：

- 页面正常显示
- 刷新页面不出现 404
- API 请求正常

## 移动端部署（可选）

### Android

```bash
cd frontend
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

### iOS

```bash
cd frontend
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

***

## 📄 许可证

MIT License

***

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
