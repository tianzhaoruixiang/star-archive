# 省份地图 GeoJSON（离线）

将省份 GeoJSON 文件放置在此目录可实现**离线加载**省份地图。

- 文件名：`{adcode}.json`，例如 `110000.json`（北京市）、`310000.json`（上海市）
- 数据来源：可从 [阿里 DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector) 下载，或使用：
  `https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`
- 若本地不存在对应文件，页面会自动从上述 CDN 加载（需联网）

常用 adcode：110000 北京，120000 天津，130000 河北，310000 上海，320000 江苏，330000 浙江，370000 山东，440000 广东，500000 重庆，510000 四川 等。
