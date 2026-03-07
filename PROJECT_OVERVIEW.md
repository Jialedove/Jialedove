# mkdocs-site 项目综述

## 1. 项目定位

`mkdocs-site/` 是一个基于 **MkDocs + mkdocs-material** 的静态站点项目，内容主要以中文为主，当前包含「知识 / 文章 / 项目 / 标签」等板块。

项目目标（从现有内容与导航结构推断）：
- 用可长期维护的方式沉淀个人知识与文章
- 通过固定的信息架构（nav）对外发布
- 依赖 GitHub Pages（gh-pages 分支）进行部署与托管

## 2. 当前结构与关键文件

- `mkdocs-site/mkdocs.yml`
  - 站点配置：站点 URL、主题（Material）、调色板、插件、导航结构（nav）
  - `extra.analytics.property` 已配置 GA 统计 ID，属于生产相关配置
- `mkdocs-site/docs/`
  - Markdown 内容页（例如 `index.md`、`atomic-notes.md` 等）
  - `docs/javascripts/shortcuts.js`：额外注入的前端脚本
- `mkdocs-site/overrides/`
  - Material 主题的覆盖/自定义资源（当前主要是 icons）
- `mkdocs-site/.github/workflows/PublishMySite.yml`
  - CI/CD：安装 MkDocs 与主题后，直接 `mkdocs gh-deploy --clean --force`

## 3. 现状总结（Build / Lint / Test / Deploy）

### 3.1 构建与本地预览

- 本地预览：`mkdocs serve`
- 构建：`mkdocs build`

目前仓库内没有 `requirements.txt`、`pyproject.toml`、`poetry.lock` 等依赖锁定文件。

### 3.2 Lint / 测试

- 当前没有标准化 lint（Markdown/YAML/JS）或测试套件。
- 对这个类型的项目而言，“测试”基本等价于：
  - `mkdocs build` 是否能成功
  - 页面链接、导航结构、站点行为是否符合预期

### 3.3 部署

GitHub Actions 在 main push / PR 时触发 job：
- `pip install mkdocs mkdocs-material`
- `mkdocs gh-deploy --clean --force`

这属于“安装+部署”一体化流程：部署动作与构建校验并未拆分。

## 4. 主要问题与潜在风险

### 4.1 可复现性风险（依赖未锁定）

CI 每次都从 PyPI 拉取最新可满足的版本组合：
- 上游依赖升级可能导致构建 warning/行为变化
- mkdocs-material 的小版本更新也可能影响主题特性、JS hooks 或渲染结果

典型表现：某天开始 CI 构建失败、或者页面样式/行为出现细微但难追踪的变化。

### 4.2 质量门槛不足（缺少 lint/检查）

常见问题在合入前不一定会被发现：
- Markdown 链接错误、相对路径写错
- `mkdocs.yml` 缩进错误导致 nav 结构异常
- 内容风格不一致、标题层级混乱

### 4.3 部署风险（PR 也跑 deploy、且使用 --force）

当前 workflow 对 PR 也运行同一个 job（且包含部署命令）。
即便因为权限而无法推送，它也会把“部署动作”与“检查动作”耦合在一起：
- PR 阶段应尽量只做 build/check，避免产生副作用
- `--force` 的强制发布会覆盖 gh-pages 分支历史，出问题时回滚成本更高

### 4.4 仓库卫生（.DS_Store、缺少 .gitignore）

当前目录下可见 `.DS_Store`，且未发现 `.gitignore`。
这会带来：
- 容易误提交 `site/`（构建产物）或系统文件
- Review 噪音大，影响协作与维护

### 4.5 前端脚本健壮性

`docs/javascripts/shortcuts.js` 使用了 `keyboard$` 全局对象。
若 Material 主题版本或页面上下文变化导致该对象不存在，可能产生 JS 报错。
（概率不一定高，但属于“容易一处改动影响全站”的点。）

## 5. 改进方向（按价值/成本分阶段）

### 5.1 短期（低成本、高收益，建议优先）

1) 增加 `.gitignore`
- 忽略：`site/`、`.venv/`、`.DS_Store`、`__pycache__/` 等
- 目标：降低误提交风险，减少噪音

2) 锁定依赖（选择一种方式即可）
- 方案 A（最简单）：新增 `requirements.txt`，固定 mkdocs/mkdocs-material 版本
- 方案 B（更规范）：用 `pyproject.toml` + lock（uv/poetry/pip-tools）
- 目标：让 CI 与本地构建结果可复现

3) 拆分 CI：PR 仅构建校验，main 才部署
- PR：跑 `mkdocs build --strict`（或至少 `mkdocs build`）
- main push：build 通过后再 `mkdocs gh-deploy`
- 目标：减少副作用，提高信心

4) 基础健壮性：JS 加 guard
- `keyboard$` 不存在时安全退出
- 目标：减少主题变更带来的全站错误风险

### 5.2 中期（建立“可持续维护”的最小工具链）

1) 引入轻量 lint（可选）
- Markdown：markdownlint（统一列表/标题/空行等风格）
- YAML：yamllint（mkdocs.yml 易受缩进影响）
- 链接检查：对站内相对链接做校验（避免死链）

2) Actions 加缓存
- `actions/setup-python` + pip cache
- 目标：减少 CI 时间和失败波动

3) 内容结构化（可选）
- 按板块分目录（如 `docs/knowledge/`、`docs/posts/`）
- `mkdocs.yml` nav 更清晰，内容增长后维护成本更低

### 5.3 长期（体验与内容质量提升）

1) 统一写作与信息架构规范
- 页面模板（标题、摘要、标签、参考链接等）
- 对“知识/文章/项目”定义清晰边界

2) 深度使用 Material 能力
- 更强的 markdown 扩展（pymdownx 系列）
- 统一 admonition / code highlight 策略
- 站内导航与搜索体验优化

3) 运营与可观测性
- Analytics 指标解读与目标设定（如内容阅读、跳出率）
- 发布节奏与内容迭代流程

## 6. 推荐落地顺序（最小化风险的路线）

建议按以下顺序推进，且每一步都能独立带来收益：

1) `.gitignore`（防误提交）
2) 依赖锁定（可复现）
3) CI 拆分（PR check / main deploy）
4) `mkdocs build --strict` 作为质量门槛（尽早发现问题）
5) 逐步引入 lint/链接检查（提升内容质量）

## 7. 决策点（需要你拍板）

为避免“工具选型拖慢进度”，建议你先确定两件事：

1) 依赖管理方式：
- 你更倾向 `requirements.txt`（简单直接）还是 `pyproject.toml`（更规范，可扩展）？

2) CI 严格程度：
- PR 上用 `mkdocs build` 还是 `mkdocs build --strict`？
  - `--strict` 能更早暴露问题，但可能需要你修一些 warning。
