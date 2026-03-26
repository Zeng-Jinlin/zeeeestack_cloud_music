# 更新 README.md Spec

## Why
当前 README.md 文件已经过时，需要根据最新的项目状态进行更新，包括前端从 Vue3 迁移到 UniApp Vue3 的变更。

## What Changes
- 更新项目说明，从 "Vue3 前端" 改为 "UniApp Vue3 前端"
- 更新项目结构，`frontend/` 改为 `frontend-uniapp/`
- 添加技术栈说明
- 更新运行方式，包括快速启动脚本和 `--console=plain` 参数
- 添加安全机制和 Git 配置说明
- 添加跨端支持功能特性

## Impact
- Affected specs: 项目文档
- Affected code: README.md

## ADDED Requirements

### Requirement: 更新项目文档
系统 SHALL 提供最新的项目文档，反映当前的项目状态。

#### Scenario: 成功更新 README
- **WHEN** 用户查看 README.md
- **THEN** README.md 应该包含最新的项目信息
- **AND** 项目结构应该显示 `frontend-uniapp/` 而不是 `frontend/`
- **AND** 应该包含技术栈说明
- **AND** 应该包含快速启动脚本的使用说明
- **AND** 应该包含安全机制和 Git 配置说明
