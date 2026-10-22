MSTS · Excel 分表记账原型（新版）

新版按照原 Excel 的 14 个分表组织，主线是“录入一笔账，按分类展示”。
默认入口：根目录 index.html（离线直接打开），或启动开发服务。
顶部可选择全部、单条或多条船，所有业务视图联动；财务可通过“管理船舶”维护档案。
每笔账必选一条船，新船为空账本。旧版浏览器记录会自动升级并保留原编号与附件。

启动（在项目根目录执行）：
  首次安装：npm --prefix prototype ci
  启动项目：npm run dev
  浏览器打开：http://127.0.0.1:5173
  停止服务：Ctrl+C
  构建离线包：npm run build
  运行测试：npm test
  检查离线包：npm run check:offline

新版操作说明：deliverables/新版原型操作说明.txt
新版验收清单：deliverables/新版原型验收清单.txt
新版代码：prototype/src/ledger；统一业务操作：engine.js；本地保存：store.js。

旧版封存：
  Git 标签：archive/full-finance-20261020
  离线入口：releases/full-finance-20261020/index.html
  源码压缩包：releases/full-finance-20261020/source.zip
  预算等原交付文档：releases/full-finance-20261020/documents
  旧版与新版的浏览器数据库完全独立。

新版仅为浏览器端 Demo，身份用于权限演练；不连接实际银行或服务器。
原始 Excel 样例保持只读，新增账目与附件保存在当前浏览器。
浏览器提示“仅当前会话有效”时，刷新可能丢失本次录入，请改用支持本地存储的浏览器或开发服务。

以下为原历史数据说明，原始来源和精度保持不变：

Vessel Management Finance System / 船舶管理财务系统

入口：index.html（可点击产品原型，浏览器直接打开）
数据报告：analysis-report.html（离线可检索全部数据及公式）
分析日期：2026-10-15；财务快照/复算日期：2026-10-14。

目录：
  source/     原工作簿只读副本，未改公式或数据。
  data/       完整CSV/JSON：单元格、公式、依赖、字段、业务行、银行流水、科目、核对、关系候选、异常。
  analysis/   system_specification.json：规则、实体、表单、验收、待确认；rows.txt：逐行审阅文本。
  tools/      extract.py → business.py → report.py：依次运行重建提取、分析和报告。analyze.py由business.py调用。

推荐阅读顺序：报告第1—7节理解业务，第8—14节评审系统设计，第15节查机器文件。

完整性：14页、6926个非空单元格、2722公式、294公式族、4963引用操作数。
2721个公式独立复算一致，1个复现原始#VALUE!。这不是Excel原生重算，也不是凭证核销。
Excel中的外部附件只提供文件名，原文件未打包PDF等附件。
总清单与分类页是重复视图；原表业务行总数不能相加认作独立交易。
没有隐藏页/隐藏行列/命名范围/外部工作簿链接。原样式与空模板保存在source副本。
输出到叶子输入是静态潜在依赖，含空白引用及未选条件分支。INDEX整列在依赖边中标记为潜在范围。
CSV采用UTF-8 BOM。公式字符串前加单引号以便在Excel按文本读取；JSON和HTML保留精确原公式。
数值结果为原始精度，界面最多展示10位小数；正式记账舍入规则需要财务确认。

原表平衡差额-2790.58199837597 USD未被自动调平。
原表公式错误、空状态、错位标签和潜在坞修缺陷在findings.csv和报告中分列。
平台实体与流程是本次逆向分析建议，不等于已实施或已确认的会计政策。
