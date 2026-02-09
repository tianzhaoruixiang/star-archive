# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.规划前请阅读 `.specify/memory/constitution.md` 并通过 Constitution Check。

---

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

---

## Technical Context (本项目默认)

*以下为 Star Archive 项目默认技术上下文；若本特性有特殊要求，可在本段覆盖。*

| 项 | 本项目约定 |
|----|------------|
| **Language/Version** | 后端：Java 17；前端：TypeScript (ES6+)，构建 Vite |
| **Primary Dependencies** | 后端：Spring Boot 3.x, Spring Data JPA, Lombok；前端：React 18, Redux Toolkit, React Router v6, Axios |
| **Storage** | Doris 4.0 / MySQL 兼容；表结构以 `docker/init-db/01-init-schema.sql` 为准 |
| **Testing** | 后端：JUnit 5, Spring Boot Test；前端：Jest, React Testing Library；覆盖率目标 ≥ 80% |
| **Target Platform** | 后端：Linux 服务器；前端：现代浏览器 |
| **Project Type** | Web 应用（前后端分离） |
| **Performance Goals** | 按业务需求在 spec 或本 plan 中补充（如接口响应时间、列表分页大小） |
| **Constraints** | 遵循 `.cursor/rules` 与 `.specify/memory/constitution.md`；API 以 DTO/类型为契约 |
| **Scale/Scope** | 见业务文档 `docs/智能监测系统-实现方案.md` 与现有模块 |

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **I. 分层与职责分离**：本特性是否保持 Controller→Service→Repository、前端 API 封装与类型一致？
- [ ] **II. SOLID/DRY/KISS/YAGNI**：是否无过度设计、无重复逻辑、接口与实现分离（若适用）？
- [ ] **III. 安全与数据**：输入校验、无 SQL 拼接、敏感数据不落日志？
- [ ] **IV. 测试与 DoD**：是否计划单元/集成测试、任务可勾选、API/类型同步？
- [ ] **V. 可维护与可追溯**：规格→计划→任务→代码可追溯、命名与日志规范？

若有违反，请在下方 **Complexity Tracking** 中说明理由。

---

## Project Structure

### Documentation (本特性)

```text
specs/[###-feature]/
├── plan.md              # 本文件 (/speckit.plan 输出)
├── research.md          # Phase 0 研究结论
├── data-model.md        # Phase 1 数据模型（若涉及）
├── quickstart.md        # Phase 1 快速验证说明（若需要）
├── contracts/           # Phase 1 API/契约（若需要）
└── tasks.md             # Phase 2 任务列表 (/speckit.tasks 输出，非 plan 生成)
```

### Source Code (本项目仓库结构)

*以下为 Star Archive 实际目录，新特性代码须落在此结构内。*

```text
backend/
├── src/main/java/com/stararchive/personmonitor/
│   ├── controller/      # REST 接口
│   ├── service/         # 业务逻辑
│   ├── repository/      # 数据访问（含 *Custom* / *Impl*）
│   ├── entity/          # 数据库实体
│   ├── dto/             # 请求/响应 DTO
│   ├── common/          # ApiResponse, GlobalExceptionHandler 等
│   └── config/          # 配置类
├── src/test/            # 单元测试与集成测试
└── pom.xml

frontend/
├── src/
│   ├── pages/           # 页面级组件
│   ├── components/      # 可复用组件
│   ├── services/        # api.ts 等 API 封装
│   ├── store/slices/    # Redux slices
│   ├── types/           # 领域/API 类型
│   └── utils/           # 工具函数
├── src/test/ 或 __tests__/  # 前端测试（若存在）
└── package.json

docker/init-db/
├── 01-init-schema.sql   # 表结构（变更时在此或迁移脚本中体现）
└── 02-test-data.sql    # 测试数据（若需）
```

**Structure Decision**: 本特性新增/修改的文件应归属上述 backend 或 frontend 对应目录；若有新包或新顶层目录须在 plan 中明确并说明理由。

---

## Complexity Tracking

> **仅当 Constitution Check 存在合理违反时填写；用于说明为何需要例外。**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| （无则留空或删表） | | |

---

## 附录：本项目规格与文档索引

- **项目宪法**：`.specify/memory/constitution.md`
- **规格驱动说明**：`docs/规格驱动编程说明.md`
- **项目规格基线**：`docs/项目规格基线.md`（当前模块与 API 摘要）
- **业务需求**：`docs/智能监测系统-实现方案.md`
- **API 清单**：`IMPLEMENTATION_GUIDE.md` / `PROJECT_SUMMARY.md`（可随实现更新）
