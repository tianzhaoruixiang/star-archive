# Star Archive 项目宪法 (Constitution)

本文档为 Star Archive（人员档案/智能监测系统）的规格驱动开发原则与约束，与 `.cursor/rules` 中的 Java/TypeScript/JavaScript 规范一致，规划与实现时必须通过 Constitution Check。

---

## 一、核心原则

### I. 分层与职责分离 (Layered Architecture)

- **后端**：Controller 仅处理 HTTP 与参数校验，禁止直接操作数据库；业务逻辑在 Service，数据访问在 Repository；对外一律使用 DTO，不直接暴露 Entity。
- **前端**：API 调用封装在 `services/api.ts`，组件按 Presentational/Container 分离；状态通过 Redux 或 Context 管理，禁止在组件内直接写业务 API 调用逻辑。
- **契约**：接口契约以后端 DTO 与前端 TypeScript 类型为准；新增/变更 API 时须同步更新两端类型与（若有）接口文档。

### II. 设计原则 (SOLID / DRY / KISS / YAGNI)

- 遵循 **SOLID**、**DRY**、**KISS**、**YAGNI**；优先简单方案，避免过度设计。
- 后端：Service 接口与实现分离；关键扩展点可考虑 Strategy/Template 模式。
- 前端：组件单职责；公共逻辑提取为 Hooks 或 HOC；禁止 `any`，使用 interface 与类型守卫。

### III. 安全与数据规范 (OWASP & Data)

- **输入校验**：后端使用 `@Valid` + JSR-303（如 `@NotBlank`, `@Size`）；禁止拼接 SQL，防注入。
- **敏感数据**：密码等加密传输与存储；敏感配置外部化（如 `application.yml` / 环境变量）。
- **前端**：用户输入做 XSS 防护；敏感请求使用 Token，不提交敏感信息到日志。

### IV. 测试与质量门禁 (Test & DoD)

- **后端**：代码变更需有单元测试，覆盖率目标 ≥ 80%；核心业务与集成点需有相应测试。
- **前端**：组件/服务需有 Jest 单元测试，覆盖率目标 ≥ 80%；使用 React Testing Library，异步用 `waitFor`。
- **完成定义 (DoD)**：与改动相关的 tasks 已勾选、检查清单通过、测试通过、API/类型与文档已同步。

### V. 可维护性与可追溯性 (Maintainability & Traceability)

- **规格先行**：新特性须有功能规格（User Stories、FR、验收标准），再技术计划与任务，最后实现。
- **命名与注释**：后端 Javadoc 方法注释、TODO/FIXME 规范；前端组件与接口类型清晰命名；禁止提交 `console.log`。
- **日志**：后端使用 SLF4J，核心操作 INFO、异常 ERROR；禁止 `System.out.println`。

---

## 二、技术栈约束 (与 .cursor/rules 一致)

### 后端 (Backend)

| 项 | 约束 |
|----|------|
| 框架 | Spring Boot 3.x，Java 17+ |
| 核心依赖 | Spring Web, Spring Data JPA, Lombok |
| 数据库 | Doris 4.0 / MySQL 兼容；驱动与方言按实际部署配置 |
| 分层 | Controller → Service → Repository → Entity；API 响应 DTO |
| 异常与响应 | 统一 `ApiResponse<T>`、`PageResponse`；`GlobalExceptionHandler` 全局处理 |
| 事务 | `@Transactional` 仅标注在 Service 方法 |
| 规范 | 见 `.cursor/rules/JAVA.mdc` |

### 前端 (Frontend)

| 项 | 约束 |
|----|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 状态 | Redux Toolkit + React-Redux |
| 路由 | React Router v6 |
| HTTP | Axios + 统一 API 封装（`services/api.ts`） |
| 测试 | Jest + React Testing Library |
| 规范 | 见 `.cursor/rules/TypeScript.mdc` 与 `JAVASCRIPT.mdc` |

### 数据与存储

- **表结构权威**：以 `docker/init-db/01-init-schema.sql` 及迁移脚本为准；Entity 与 Repository 与之保持一致。
- **多库兼容**：若同时支持 Doris/MySQL，在配置或规格中明确（如系统配置中的 Text2Sql 数据库类型）。

---

## 三、项目结构约定 (Repository Layout)

- **后端**：`backend/src/main/java/com/stararchive/personmonitor/`
  - `controller/` — REST API
  - `service/` — 业务逻辑
  - `repository/` — 数据访问（含 Custom/Impl 若需）
  - `entity/` — 数据库映射
  - `dto/` — 请求/响应 DTO
  - `common/` — ApiResponse、全局异常等
  - `config/` — 配置类
- **前端**：`frontend/src/`
  - `pages/` — 页面
  - `components/` — 可复用组件
  - `services/api.ts` — API 与类型
  - `store/slices/` — Redux slices
  - `types/` — 领域类型
  - `utils/` — 工具
- **规格与文档**：`docs/`、`.specify/`、`specs/[编号]-[特性名]/`

---

## 四、开发工作流 (Governance)

- **新特性**：先写功能规格（`/speckit.specify`）→ 可选澄清（`/speckit.clarify`）→ 技术计划（`/speckit.plan`）→ 任务（`/speckit.tasks`）→ 检查清单（`/speckit.checklist`）→ 实现（`/speckit.implement` 或人工按 tasks 执行）。
- **小改动/Bug**：可不建完整 spec，但 API/数据变更须同步 DTO、类型、Schema 与文档。
- **Constitution Check**：在 `/speckit.plan` 的 Phase 0/Phase 1 必须通过本宪法条款；若有违反须在 plan 的 Complexity Tracking 中说明理由。

---

## 五、版本与修订

- **Version**: 1.0  
- **Ratified**: 项目采用规格驱动开发时生效  
- **Last Amended**: 随 .cursor/rules 或项目约定变更时更新  

本宪法与 `.cursor/rules` 一致；冲突时以宪法中明确写出的约束为准，其余以 rules 为准。
