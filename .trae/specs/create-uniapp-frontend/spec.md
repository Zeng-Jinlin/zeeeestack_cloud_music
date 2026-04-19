# uni-app 前端 Spec

## Why
需要为已有的 Spring Boot + Kotlin 后端创建一个 uni-app 前端，使用 Vue3 + Vite 技术栈，提供访客音乐播放功能。

## What Changes
- 新增 uni-app 项目（Vue3 + Vite）
- 实现音乐列表展示
- 实现音乐播放器功能（使用临时播放链接）
- 实现封面图片展示
- 无需登录/注册，访客模式

## Impact
- 新增目录：`frontend-uniapp/`
- 依赖后端 API：`GET /api/songs`, `GET /api/songs/{songId}/play-url`, `GET /api/songs/{songId}/cover`

## ADDED Requirements
### Requirement: 音乐列表
系统 SHALL 提供音乐列表展示功能，显示歌曲名称和封面。

#### Scenario: 获取音乐列表
- **WHEN** 用户打开应用
- **THEN** 显示所有可用的音乐列表

### Requirement: 音乐播放
系统 SHALL 提供音乐播放功能，使用后端临时播放链接。

#### Scenario: 播放音乐
- **WHEN** 用户点击某首歌曲
- **THEN** 系统通过 songId 请求后端获取 10 分钟有效临时播放链接
- **THEN** 使用该临时链接播放音乐

### Requirement: 封面展示
系统 SHALL 展示音乐封面图片，无封面时显示默认封面。

#### Scenario: 显示封面
- **WHEN** 音乐列表或播放器展示音乐
- **THEN** 显示对应封面，无封面时显示默认封面
