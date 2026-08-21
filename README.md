# LINUX.SB-Enhance-Script

LINUX.SB 布局优化与功能增强油猴脚本（Tampermonkey / Userscript）。

在原站基础上提供主题布局定制、内容过滤、图片灯箱、多图床上传（带优先级 failover）、自动签到、首页身份标识与头像资料卡等增强功能。

## 特别鸣谢 & 友情链接

- [LinuxSB](https://linux.sb)
- [大肥鱼DeepSeek](https://deepseek.com/)

## 功能

- **主题布局**：页面最大宽度、顶部栏高度、正文字号、全局圆角、侧栏宽度等参数自由调节；内置中性深灰 / 石墨青 / 暖石墨 / 跟随原站四套主题，支持强调色与文字颜色定制
- **设置面板**：居中模态框 + 分类 Tab（布局参数 / 首页 / 图床上传 / 主题颜色 / 内容过滤），所有设置即时生效并自动保存
- **多图床上传**：
  - 内置 FreeImage（免密钥）、Imgur、Nodeimage、Catbox 等预设，支持完全自定义接口
  - 可配置请求方式（POST/PUT/PATCH/GET）、请求体格式（multipart / JSON / 二进制）、自定义请求头与认证方式
  - 多套命名配置，**列表拖动排序决定优先级**；上传失败自动依次尝试下一个图床，全部失败弹窗提示原因
  - 拖拽 / 粘贴 / 点击按钮三种触发方式，上传中在编辑器插入占位，成功后原位替换为图片链接
- **内容过滤**：按标题关键字、用户名屏蔽帖子
- **图片灯箱**：帖子/回复图片点击放大预览，Esc 或点击关闭
- **自动签到**：每日自动完成站点签到
- **首页增强**：个性化头图与搜索、侧栏位置对调、身份标识（创作者 / AI机器人 / 社区主理人）、UID 徽章、头像悬停基础资料卡（积分 / 身份 / 签到 / 邀请数据）
- **远程更新**：自动检查新版本并提示一键更新

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome/Edge/Firefox 均可）
2. 打开发布产物安装：
   - GitHub Release：`dist/linux-sb-enhance.user.js`
   - 或直接访问 `https://static.yaoonion.fun/lsb/pub/linux-sb-enhance.user.js`
3. 打开 `https://linux.sb` 任意页面，点击页面左下角的悬浮按钮进入设置

> 脚本内置 `@updateURL` / `@downloadURL`，发布新版本后油猴会自动检测更新。

## 开发

```bash
# 安装依赖
npm install

# 构建（tsc 编译 → esbuild 打包 → 生成油猴脚本元数据）
npm run build

# 产物
dist/linux-sb-enhance.user.js
```

### 目录结构

```
├── .github/workflows/release.yml   # 发布工作流
├── scripts/
│   ├── bundle.js                   # esbuild 打包
│   └── generate-userscript.js      # 生成油猴脚本（拼接元数据头）
├── src/
│   ├── main.ts                     # 入口：启动引导、更新检查
│   ├── constants.ts                # 常量、主题定义、CSS、图床预设
│   ├── types.ts                    # 类型定义与 GM API 声明
│   ├── state.ts                    # 共享可变状态
│   ├── settings.ts                 # 设置读写 / 规范化 / 迁移
│   ├── theme.ts                    # 主题应用与颜色工具
│   ├── interface.ts                # 设置面板（模态框 + Tab）、拖动
│   ├── home.ts                     # 首页个性化、身份标识、资料卡
│   ├── imageUpload.ts              # 多图床上传、优先级 failover、占位替换
│   ├── autoCheckin.ts              # 自动签到
│   ├── lightbox.ts                 # 图片灯箱
│   ├── filters.ts                  # 内容过滤
│   ├── search.ts                   # 搜索框增强、圆角覆盖
│   ├── checkUpdate.ts              # 远程更新检查
│   └── status.ts                   # 状态提示
└── package.json                    # 脚本元数据 + 构建脚本
```

## 发布

推送 `main` 分支即触发 [release.yml](.github/workflows/release.yml)：

1. `npm install && npm run build`
2. 创建 GitHub Release（`v<版本号>`）并附带 `dist/linux-sb-enhance.user.js`
3. 将脚本与 `version.json` 推送到 static 仓库：
   - 标准版本号（`x.y.z`）→ `lsb/pub/`
   - 预览版（含字母）→ `lsb/perv/`

### 仓库配置要求

- **`STATIC_REPO_TOKEN`**：可写 `SuperUseryjh/static` 仓库的 Personal Access Token，用于推送更新产物
- 工作流已声明 `permissions: contents: write`，`GITHUB_TOKEN` 即可创建 Release

## 版本号规则

- `2.0.0` 为标准版，发布到 `pub`，油猴按 24 小时间隔检查更新
- `2.0.0-beta1` 等含字母的为预览版，发布到 `perv`，按 1 小时间隔检查更新

## License

GNU GPL v3
