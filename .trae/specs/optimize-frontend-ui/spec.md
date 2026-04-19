# 前端界面优化 Spec

## Why
需要优化前端界面，使其更符合个人音乐平台的风格。所有音乐都是用户自己创作的，不需要显示艺术家信息，同时添加品牌标识和logo。

## What Changes
- 更新页面标题为 "zeeeestack云音乐"
- 添加品牌logo到页面头部
- 移除艺术家信息显示
- 优化整体布局和视觉效果

## Impact
- Affected specs: 前端界面
- Affected code: frontend/src/views/MusicList.vue, frontend/src/App.vue, frontend/index.html

## ADDED Requirements
### Requirement: 品牌标识
系统 SHALL 在页面顶部显示 "zeeeestack云音乐" 标题和品牌logo。

#### Scenario: 页面加载
- **WHEN** 用户打开应用
- **THEN** 页面顶部显示品牌logo和标题 "zeeeestack云音乐"

### Requirement: 移除艺术家信息
系统 SHALL 不在音乐列表中显示艺术家信息，因为所有音乐都是用户自己创作的。

#### Scenario: 显示音乐列表
- **WHEN** 音乐列表加载
- **THEN** 只显示歌曲标题和专辑信息，不显示艺术家
