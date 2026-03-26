# zeeeestack云音乐

基于 Spring Boot + Kotlin 后端和 UniApp Vue3 前端的个人音乐平台。

## 项目结构

```
.
├── backend/                  # Spring Boot + Kotlin 后端
├── frontend-uniapp/         # UniApp Vue3 前端
├── music/
│   ├── music-files/          # 音乐文件存储目录
│   └── music-cover/          # 音乐封面存储目录
├── start.bat                 # Windows 快速启动脚本
└── start.sh                  # Linux/Mac 快速启动脚本
```

## 技术栈

### 后端
- Spring Boot 3.2.0
- Kotlin 1.9.20
- Java 17

### 前端
- UniApp 3.0
- Vue 3.4.21
- Vite 5.2.8

## 功能特性

1. **音乐管理**：通过 SFTP 上传音乐文件至 `music/music-files` 目录
2. **访客访问**：无需登录即可收听音乐
3. **临时播放链接**：有效期 10 分钟，使用 HMAC-SHA256 签名
4. **安全密钥**：32 字节随机密钥，每周自动更新
5. **双重验证**：签名合法性验证 + 时效性验证
6. **音乐封面**：支持显示音乐封面图片，无封面时显示默认封面
7. **跨端支持**：基于 UniApp 框架，支持 H5、小程序、App 等多平台

## 运行项目

### 快速启动（推荐）

**Windows:**
```powershell
.\start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### 手动启动

#### 后端

Windows PowerShell:
```powershell
cd backend
.\gradlew.bat bootRun --console=plain
```

Linux/Mac:
```bash
cd backend
./gradlew bootRun --console=plain
```

后端服务将在 `http://localhost:8080` 启动。

#### 前端

```bash
cd frontend-uniapp
npm install
npm run dev:h5
```

前端服务将在 `http://localhost:3000` 启动。

## API 接口

- `GET /api/songs` - 获取音乐列表
- `GET /api/songs/{songId}/play-url` - 获取临时播放链接
- `GET /api/songs/{songId}/cover` - 获取音乐封面
- `GET /api/play/{songId}?expires={timestamp}&sign={signature}` - 播放音乐

## 文件上传

### 音乐文件

通过 SFTP 协议将音乐文件上传至 `music/music-files` 目录，支持格式：mp3, wav, flac, ogg, m4a, aac。

### 封面文件

通过 SFTP 协议将封面图片上传至 `music/music-cover` 目录，要求：
- 文件名与对应音乐文件名完全一致（除扩展名）
- 支持格式：jpg, jpeg, png, webp
- 建议尺寸：不小于 300x300 像素

## 安全机制

### 临时播放链接
- 使用 HMAC-SHA256 签名算法
- 链接有效期为 10 分钟
- 包含签名合法性验证和时效性验证双重机制

### 安全密钥
- 32 字节随机密钥
- 存储于 `backend/security-key.dat`
- 每周自动更新

## Git 配置

建议在 `.gitignore` 中配置以下内容：

```
# 音乐文件
music/music-files/
music/music-cover/

# 安全密钥
backend/security-key.dat

# 构建产物
backend/build/
frontend-uniapp/node_modules/
frontend-uniapp/dist/
```
