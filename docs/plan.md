逐模块完善系统实现计划

总体策略





第一步: 启动并验证现有系统的核心功能



第二步: 按优先级逐个完善剩余 13 个模块



实现标准: 生产级别（完整业务逻辑、异常处理、参数校验、单元测试）

第一阶段：系统启动与验证

1.1 启动 Docker 服务

操作步骤:

cd docker
docker-compose up -d
# 等待服务启动（约 30 秒）
docker-compose ps  # 验证所有服务状态为 Up

1.2 初始化数据库

操作步骤:

mysql -h 127.0.0.1 -P 9030 -u root < init-db/01-init-schema.sql
mysql -h 127.0.0.1 -P 9030 -u root < init-db/02-init-data.sql
# 验证表创建成功
mysql -h 127.0.0.1 -P 9030 -u root -e "SHOW TABLES FROM archive;"

1.3 启动后端服务

操作步骤:

cd backend
mvn clean install
mvn spring-boot:run
# 验证启动成功，访问 http://localhost:8081/api/swagger-ui.html

1.4 启动前端服务

操作步骤:

cd frontend
npm install
npm run dev
# 验证启动成功，访问 http://localhost:5173

1.5 功能验证

测试清单:





登录功能（admin/admin123）



首页统计卡片显示



人员列表查询



人员详情查看



Swagger API 文档可访问

第二阶段：逐模块完善（生产级别）

模块 1: PersonTravel（人员行程） - 优先级最高

为什么优先: 人员详情页需要展示行程时间轴，是核心业务功能

后端实现（6个文件）:





[backend/src/main/java/com/archive/entity/PersonTravel.java](backend/src/main/java/com/archive/entity/PersonTravel.java)





映射 person_travel 表



字段：travelId、personId、eventTime、departure、destination、travelType 等



添加 @PrePersist/@PreUpdate 生命周期方法



[backend/src/main/java/com/archive/repository/PersonTravelRepository.java](backend/src/main/java/com/archive/repository/PersonTravelRepository.java)





自定义查询：按人员ID查询、按时间范围查询、按类型查询



分页查询接口



[backend/src/main/java/com/archive/dto/PersonTravelDTO.java](backend/src/main/java/com/archive/dto/PersonTravelDTO.java)





从 Entity 转换方法



包含所有必要字段



[backend/src/main/java/com/archive/service/PersonTravelService.java](backend/src/main/java/com/archive/service/PersonTravelService.java)





按人员ID查询行程（时间倒序）



统计出国次数



查询最近N次行程



参数校验和异常处理



[backend/src/main/java/com/archive/controller/PersonTravelController.java](backend/src/main/java/com/archive/controller/PersonTravelController.java)





GET /persons/{personId}/travels - 查询人员行程



GET /travels - 行程列表（分页）



GET /travels/{travelId} - 行程详情



Swagger 注解完整



[backend/src/test/java/com/archive/service/PersonTravelServiceTest.java](backend/src/test/java/com/archive/service/PersonTravelServiceTest.java)





单元测试（覆盖率 >80%）

前端实现（3个文件）:





[frontend/src/types/index.ts](frontend/src/types/index.ts) - 添加 PersonTravel 类型



[frontend/src/services/travelService.ts](frontend/src/services/travelService.ts) - 行程 API 服务



[frontend/src/pages/Persons/components/TravelTimeline.tsx](frontend/src/pages/Persons/components/TravelTimeline.tsx) - 行程时间轴组件



更新 [frontend/src/pages/Persons/PersonDetail.tsx](frontend/src/pages/Persons/PersonDetail.tsx) - 集成行程时间轴

模块 2: News（新闻）

后端实现（6个文件）:





Entity: News.java



Repository: NewsRepository.java（支持关键词搜索、分类筛选、时间范围）



DTO: NewsDTO.java、NewsListDTO.java、HotNewsDTO.java



Service: NewsService.java（列表查询、详情、热点分析、词云数据）



Controller: NewsController.java（新闻CRUD、搜索、统计分析）



Test: NewsServiceTest.java

前端实现（5个文件）:





Service: newsService.ts（完善）



Redux: newsSlice.ts



页面: Situational/News/NewsList.tsx



页面: Situational/News/NewsDetail.tsx



组件: Situational/NewsAnalysis/HotRanking.tsx

模块 3: PersonSocialDynamic（社交动态）

后端实现（6个文件）:





Entity: PersonSocialDynamic.java



Repository: PersonSocialDynamicRepository.java



DTO: SocialDynamicDTO.java、SocialAnalysisDTO.java



Service: SocialDynamicService.java



Controller: SocialDynamicController.java



Test: SocialDynamicServiceTest.java

前端实现（5个文件）:





Service: socialService.ts



Redux: socialSlice.ts



页面: Situational/Social/SocialList.tsx



页面: Situational/Social/SocialDetail.tsx



组件: Persons/components/SocialDynamics.tsx（人员详情中展示）

模块 4: KeyPersonLibrary（重点人员库）

后端实现（8个文件）:





Entity: KeyPersonLibrary.java、KeyPersonLibraryMember.java



Repository: KeyPersonLibraryRepository.java、KeyPersonLibraryMemberRepository.java



DTO: LibraryDTO.java、LibraryDetailDTO.java



Service: KeyPersonLibraryService.java



Controller: KeyPersonLibraryController.java



Test: KeyPersonLibraryServiceTest.java

前端实现（6个文件）:





Service: keyPersonService.ts（完善）



Redux: keyPersonSlice.ts



页面: KeyPersons/index.tsx（完整实现）



组件: KeyPersons/LibraryList.tsx



组件: KeyPersons/LibraryPersons.tsx



组件: KeyPersons/LibraryManage.tsx

模块 5: Directory + UploadedDocument（文件管理）

后端实现（10个文件）:





Entity: Directory.java、UploadedDocument.java



Repository: DirectoryRepository.java、UploadedDocumentRepository.java



DTO: DirectoryDTO.java、DocumentDTO.java、FileUploadRequest.java



Service: DirectoryService.java、FileService.java、SeaweedFSService.java



Controller: WorkspaceController.java（目录+文件接口）



Test: FileServiceTest.java

前端实现（8个文件）:





Service: workspaceService.ts、fileService.ts



Redux: workspaceSlice.ts



页面: Workspace/DataManagement/index.tsx（完整实现）



组件: Workspace/components/FileTree.tsx



组件: Workspace/components/FileList.tsx



组件: Workspace/components/FileUpload.tsx



组件: Workspace/components/FilePreview.tsx

模块 6: AnalysisModel（分析模型）

后端实现（8个文件）:





Entity: AnalysisModel.java、AnalysisModelRun.java



Repository: AnalysisModelRepository.java、AnalysisModelRunRepository.java



DTO: ModelDTO.java、ModelRunDTO.java、ModelConditionDTO.java



Service: ModelService.java、ModelExecutor.java



Controller: ModelController.java



Test: ModelServiceTest.java

前端实现（6个文件）:





Service: modelService.ts



Redux: modelSlice.ts



页面: Workspace/ModelManagement/index.tsx（完整实现）



组件: Workspace/ModelManagement/ModelList.tsx



组件: Workspace/ModelManagement/ModelEditor.tsx



组件: Workspace/ModelManagement/ModelResults.tsx

模块 7: FusionTask（档案融合）

后端实现（8个文件）:





Entity: FusionTask.java、FusionResult.java



Repository: FusionTaskRepository.java、FusionResultRepository.java



DTO: FusionTaskDTO.java、FusionResultDTO.java



Service: FusionService.java、DocumentParserService.java、PersonMatchService.java



Controller: FusionController.java



Test: FusionServiceTest.java

前端实现（5个文件）:





Service: fusionService.ts



Redux: fusionSlice.ts



页面: Workspace/ArchiveFusion/index.tsx（完整实现）



组件: Workspace/ArchiveFusion/TaskList.tsx



组件: Workspace/ArchiveFusion/MatchResults.tsx

模块 8-13: 其他支撑模块





DocumentChunk: 文档分块与向量检索



QaHistory: 问答历史记录



Dashboard 完善: 地图数据、排名统计、卡片完整实现

每个模块的标准实现清单

后端层（每模块约 6-10 个文件）





Entity 类（JPA 注解、字段映射、生命周期）



Repository 接口（自定义查询、分页、统计）



DTO 类（请求/响应分离、验证注解）



Service 类（业务逻辑、事务管理、异常处理）



Controller 类（REST 接口、参数校验、Swagger 文档）



单元测试（Service 层测试，覆盖率 >80%）

前端层（每模块约 5-8 个文件）





TypeScript 类型定义



API Service 函数



Redux Slice（状态管理、异步 Thunk）



页面组件（主页面、列表、详情）



子组件（卡片、表单、图表等）



CSS 样式文件

预估工作量

按模块统计





PersonTravel: ~15 个文件



News: ~15 个文件



PersonSocialDynamic: ~15 个文件



KeyPersonLibrary: ~18 个文件



Directory + Document: ~20 个文件



AnalysisModel: ~18 个文件



FusionTask: ~18 个文件



其他模块: ~30 个文件



Dashboard 完善: ~15 个文件

总计新增: 约 160-180 个文件

技术要点

后端关键技术





Doris ARRAY 字段处理: 使用 JSON 序列化



分页查询优化: PageRequest + Sort



复杂统计查询: @Query 自定义 SQL



文件上传: SeaweedFS HTTP API 集成



模型执行: 动态 SQL 生成



向量检索: Doris ANN 索引

前端关键技术





地图可视化: ECharts geo + 中国地图 JSON



时间轴组件: Ant Design Timeline



词云组件: react-wordcloud 或 ECharts wordcloud



文件上传: Ant Design Upload + 进度条



树形目录: Ant Design Tree



动态表单: 模型条件构建器

实施顺序

阶段 1: 启动验证（预计 10 分钟）





启动 Docker 服务



初始化数据库



启动后端服务



启动前端服务



测试核心功能

阶段 2: 高优先级模块（预计每模块 30-40 分钟）





PersonTravel - 行程模块（人员详情必需）



News - 新闻模块（态势感知核心）



PersonSocialDynamic - 社交动态（态势感知核心）

阶段 3: 核心业务模块（预计每模块 40-50 分钟）





KeyPersonLibrary - 重点人员库（独立功能模块）



Directory + UploadedDocument - 文件管理（工作区核心）

阶段 4: 高级功能模块（预计每模块 40-50 分钟）





AnalysisModel - 分析模型（模型管理）



FusionTask - 档案融合（智能融合）

阶段 5: 支撑与完善（预计 30-40 分钟）





DocumentChunk - 文档分块



QaHistory - 问答历史



Dashboard 完善 - 地图、统计卡片完整实现

质量标准

代码质量





所有代码遵循 JAVA.mdc、TypeScript.mdc 规范



Entity 必须有完整注释



Controller 必须有 Swagger 注解



Service 必须有事务注解



DTO 必须有验证注解



前端组件必须有 TypeScript 类型定义

功能完整性





每个模块必须包含 CRUD 基本操作



必须有参数校验和错误处理



前端必须有加载状态和错误提示



必须支持分页（列表类接口）

测试覆盖





Service 层单元测试覆盖率 >80%



关键业务逻辑必须有测试用例



异常情况必须有测试覆盖

成功标准

完成后系统应具备：





所有 16 张数据表对应的完整 CRUD 接口



前端 5 个模块的完整页面实现



首页地图可视化和统计完整功能



人员档案的标签筛选和详情完整展示



态势感知的新闻/社交列表和分析



工作区的文件管理和模型管理



完整的单元测试覆盖



详细的 API 文档

风险与注意事项





Doris 兼容性: ARRAY 类型在 JPA 中处理需要序列化



文件上传: SeaweedFS 需要正确配置网络访问



向量检索: ANN 索引需要 Doris 4.0+ 支持



性能: 大数据量时注意分页和索引优化



测试数据: 建议添加模拟数据用于前端展示