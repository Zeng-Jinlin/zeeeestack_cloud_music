# zeeeestack云音乐 - UniApp 版本

基于 UniApp Vue3 + Vite 的跨端个人音乐平台。

## 项目结构

```
frontend-uniapp/
├── pages/                  # 页面目录
│   └── index/
│       └── index.vue       # 主页面
├── App.vue                 # 应用入口组件
├── main.js                 # 应用入口文件
├── pages.json              # 页面路由配置
├── manifest.json           # 应用配置
├── vite.config.js          # Vite 配置
├── package.json            # 项目依赖
└── index.html              # H5 入口
```

## 主要变更说明

### 1. HTML 标签转换

| 原标签 | UniApp 组件 |
|--------|-------------|
| div    | view        |
| span   | text        |
| img    | image       |
| ul/li  | scroll-view + view |
| audio  | uni.createInnerAudioContext |

### 2. 网络请求替换

- `fetch` → `uni.request`
- 封装了 Promise 风格的 request 函数

### 3. 音频播放替换

- HTML5 `<audio>` → `uni.createInnerAudioContext()`
- 在 onMounted 中初始化，在 onUnmounted 中销毁

### 4. 样式单位

- px → rpx（响应式像素）
- 保持原有布局逻辑

## 运行项目

### 安装依赖

```bash
cd frontend-uniapp
npm install
```

### H5 开发

```bash
npm run dev:h5
```

### 构建 H5

```bash
npm run build:h5
```

### 其他平台

- 微信小程序：使用 HBuilderX 打开项目，运行到微信小程序
- App：使用 HBuilderX 打包
- 更多平台参考 UniApp 官方文档

## API 代理

开发环境通过 Vite 代理 `/api` 请求到 `http://localhost:8080`，与原项目保持一致。

生产环境请根据实际部署情况配置服务器代理或修改请求地址。

## 注意事项

1. 音频播放：小程序和 App 平台可能需要配置域名白名单
2. 图片加载：网络图片同样需要配置域名白名单
3. 跨端兼容：当前主要针对 H5 平台优化，其他平台可能需要进一步适配
