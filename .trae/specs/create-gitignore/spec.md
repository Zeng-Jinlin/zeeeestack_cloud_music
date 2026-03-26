# 创建 .gitignore 文件 Spec

## Why

项目缺少 .gitignore 文件来忽略敏感配置、用户数据和构建产物，需要创建一个完整的 .gitignore 文件。

## What Changes

* 创建根目录的 .gitignore 文件

* 忽略敏感配置文件（如 security-key.dat）

* 忽略用户数据文件夹（如 music/）

* 忽略构建产物（如 build/, node\_modules/, dist/）

* 忽略 IDE 配置文件

* 忽略系统文件

* 忽略.vscdode / .trae中不影响开源协作的部分和涉及个人隐私的部分

## Impact

* Affected specs: 项目配置

* Affected code: .gitignore

## ADDED Requirements

### Requirement: 创建 .gitignore 文件

系统 SHALL 提供一个 .gitignore 文件来忽略敏感文件和用户数据。

#### Scenario: 成功创建 .gitignore

* **WHEN** 用户查看项目根目录

* **THEN** 应该存在 .gitignore 文件

* **AND** .gitignore 应该包含敏感文件忽略规则

* **AND** .gitignore 应该包含用户数据忽略规则

* **AND** .gitignore 应该包含构建产物忽略规则

