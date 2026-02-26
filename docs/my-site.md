---
title: 个人网站
description: 本站的搭建记录与技术栈
tags:
  - seed
  - Web开发
publish: true
---

# 个人网站

这是我个人网站的搭建记录。

## 技术栈

| 组件 | 技术 |
|------|------|
| 静态站点生成 | MkDocs |
| 主题 | Material for MkDocs |
| 部署 | Netlify (Primary) + GitHub Pages (Rollback) |
| 知识图谱 | force-graph (自定义实现) |

## 搭建步骤

1. **MkDocs + Netlify**：现代 Serverless 静态托管
2. **Markdown 格式化**：将笔记转为适合发布的格式
3. **自动化部署**：通过 Netlify Git 插件与 GitHub Actions 双重保障
2. **Markdown 格式化**：将笔记转为适合发布的格式
3. **GitHub Pages 部署**：自动化发布流程

## 已完成的功能

- [x] 使用 Material 主题
- [x] 键盘快捷键测试
- [x] Google Analytics 流量分析
- [x] 标签系统
- [x] GitHub 图标（右下角）
- [x] 知识图谱（右侧面板）
- [x] 深色/浅色模式切换

## 待完成的功能

- [ ] 使用 `media` 查询色彩搭配
- [ ] 自定义图标设置
- [ ] 隐藏侧边栏功能
- [ ] 评论系统
- [ ] 数学公式支持（LaTeX）

## 知识图谱实现

本站右侧的知识图谱使用 [force-graph](https://github.com/vasturiano/force-graph) 库实现：

- **渲染引擎**：HTML5 Canvas
- **物理引擎**：d3-force
- **特点**：
    - 显示页面之间的关联关系
    - 当前页面节点高亮
    - 支持放大、缩小、全屏
    - 响应式设计（移动端自动隐藏）

---

## 相关链接

- [书籍阐释项目](book-interpretation.md) - 另一个研究项目
- [原子化笔记](atomic-notes.md) - 知识管理方法

<small>最后更新：2026年2月</small>
