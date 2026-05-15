# HMusic 版本迭代与部署说明文档

本手册记录了从 Feishin 原版到 **HMusic (Private Edition)** 的深度定制化过程，涵盖 v0.1.2 与 v0.2.0 两个核心迭代版本的变更详情、方案实现及部署注意事项。

---

## 1. 版本迭代摘要

### v0.1.2: 品牌化与稳定性加固
*   **目标**：彻底去除 Feishin 痕迹，统一品牌视觉，修复合并冲突导致的设置页崩溃。
*   **核心变更**：
    *   **品牌重塑**：全量替换 `assets/icons` 及网页 Favicon 为 `@Music.png`（代码中重命名为 `brand-logo.png`）。
    *   **标题锁定**：在 `app.tsx` 引入 `TitleEffect` 监控逻辑，每秒强制校验 `document.title`，防止路由切换回退到 "Feishin"。
    *   **设置页修复**：解决 `SettingsContextModal` 懒加载导致的 React #130 报错，将弹窗组件改为静态导入。
    *   **隐私增强**：移除高级设置中的“更新检查”、“发布日志”及所有指向 GitHub 的外部链接。
    *   **API 掩码**：在 Subsonic 和 Jellyfin 的请求头中，将 `Client="Feishin"` 替换为动态读取的 `WEB_TITLE`。

### v0.2.0: 多服务器 Failover 与黑客终端 UI
*   **目标**：提升系统可用性，为用户提供沉浸式的全自动登录体验。
*   **方案实现**：
    *   **多节点轮询**：支持 `SERVER_URL1` 至 `SERVER_URL5` 共 5 组配置。系统依次尝试，单台失败 3 次后自动切换至下一节点。
    *   **黑客终端 UI**：在 `AutoLoginDispatcher` 引入 monochromatic (单色) 终端界面，实时滚动显示“内核启动”、“注入代码”、“隧道建立”等连接日志。
    *   **故障自愈**：若所有服务器均连接失败，系统会标记 `hmusic_all_servers_failed`。用户刷新时将强制执行 `localStorage.clear()`，彻底解决脏缓存导致的死锁。
    *   **变量动态化**：登录成功后，根据该节点的 `WEB_TITLE[n]` 动态更新整站 UI 标题。

---

## 2. 核心文件变更列表

| 模块 | 涉及文件 | 变更内容 |
| :--- | :--- | :--- |
| **基础配置** | `Dockerfile`, `settings.js.template` | 新增 `MULTI_SERVER` 及 1-5 号服务器环境变量占位。 |
| **认证逻辑** | `auto-login-dispatcher.tsx` | 重写为终端日志组件，实现多节点 Failover 状态机。 |
| **路由安全** | `app-router.tsx`, `auth-code-page.tsx` | 优化 PIN 码验证后的重定向流，确保进入自动连接序列。 |
| **UI 品牌** | `index.html`, `app.tsx`, `window-bar.tsx` | 全局标题、图标路径、 Manifest 名称及标题防篡改逻辑。 |
| **API 伪装** | `subsonic-controller.ts`, `jellyfin-api.ts` | 拦截所有底层通信，将客户端名称伪装为私人品牌。 |
| **系统层** | `main/index.ts`, `linux/mpris.ts` | 修改桌面端托盘提示及 Linux 控制中心显示的身份标识。 |

---

## 3. 容器构建 (Build) 指南

项目采用了多阶段构建，确保在 **x86_64** (Intel/AMD) 和 **ARM64** (Apple M 系列 / 远端服务器) 架构下均能稳定产出。

### 构建命令
```bash
# 建议带上版本号标签
docker build -t feishin-auth:v0.2.0 .
```

### 为什么这样构建更安全？
1.  **--ignore-scripts**：在 `pnpm install` 时禁用了原生编译脚本，防止 Electron 桌面端依赖在 Web 容器构建阶段因环境不匹配报错。
2.  **Alpine 基础镜像**：极简体积，减少攻击面。
3.  **Nginx 模板**：利用 Nginx 官方的模板机制，在容器启动时才将环境变量注入 `settings.js`，实现“一次构建，多处部署”。

---

## 4. 代码迁移注意事项

将代码复制到别的服务器或机器时，请务必遵守以下规则，否则可能引发构建失败或环境污染。

### ⚠️ 绝对严禁复制的文件夹
在执行 `scp` 或 `rsync` 时，**必须排除**以下目录：
1.  `node_modules/`：包含大量架构相关的二进制包，跨机器复制会导致严重的链接错误。
2.  `out/` / `dist/`：旧的编译产物，会干扰新机器的构建。
3.  `.git/`：（可选）如果你不需要版本控制记录，可以排除。
4.  `.pnpm-store/`：本地包缓存。

### 推荐的迁移方案
**方式 A (推荐): 使用 Git**
```bash
git clone <your-private-repo-url>
```

**方式 B: 使用 rsync 排除法**
```bash
rsync -av --exclude='node_modules' --exclude='out' --exclude='.git' ./ user@remote:/path/to/hmusic/
```

### 环境依赖要求
新机器只需具备以下环境之一即可：
*   **直接构建**：Node.js 20+ & pnpm 9+
*   **容器构建**：Docker (无需安装 Node 环境)

---

## 5. 多服务器部署示例 (Docker Compose)

```yaml
services:
  hmusic:
    image: feishin-auth:v0.2.0
    environment:
      - MULTI_SERVER=true
      - ALLOW_CODE=9999 # 设置全局访问 PIN 码
      # 主节点
      - SERVER_URL1=https://jellyfin.example.com
      - SERVER_TYPE1=jellyfin
      - USERNAME1=myuser
      - PASSWORD1=mypass
      - WEB_TITLE1=HMusic-Main
      # 备用节点
      - SERVER_URL2=https://navidrome.example.com
      - SERVER_TYPE2=subsonic
      - USERNAME2=backup_user
      - PASSWORD2=backup_pass
      - WEB_TITLE2=HMusic-Backup
```


  🚀 部署与迁移核心要点（摘自文档）：

  1. 构建 (Build)
  在任何机器（x86 或 ARM）上，只需进入根目录执行：

   1 docker build -t feishin-auth:v0.2.0 .

  2. 代码迁移 (Migration)
  如果你通过压缩包或 rsync 复制代码到另一台服务器，绝对禁止复制以下文件夹：
   * ❌ node_modules/ (引发架构冲突)
   * ❌ out/ (包含旧的、可能不匹配的产物)
   * ❌ .pnpm-store/

  推荐方案：

   1 # 在新服务器上直接拉取 Git 仓库
   2 git clone <your-repo>
   3 # 或者使用排除法复制
   4 rsync -av --exclude='node_modules' --exclude='out' ./ user@remote:/path/

  3. 运行 (Run)
  参考 docs/ITERATION_SUMMARY.md 最后的 Docker Compose 示例，通过 MULTI_SERVER=true 即可启用全自动的 Failover 登录体验。


---
*文档更新日期：2026-05-15*
