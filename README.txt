MSTS 船舶管理财务系统 · 八模块联动产品原型

入口：index.html（浏览器直接打开，无需网络）。
评审操作说明：deliverables/原型操作说明.txt
老板八项要求覆盖：deliverables/老板需求覆盖清单.txt
主线：工作台五步演示 → 分次付款 → 船东账单 → 回款 → 总账审核过账。
示例账套：MSTS / BLUE HORIZON / NORTH STAR。角色、船舶、期间均可切换。
演示单据和附件仅保存在当前浏览器；一键重置不影响原始历史。

源码：prototype/src/finance 为统一业务服务、主数据、金额计算及本地保存；页面在prototype/src/views。
开发：npm --prefix prototype run dev
验证：npm --prefix prototype test
打包：npm --prefix prototype run build（同步dist及根目录离线入口）。
此原型未接入生产数据库、银行支付、税务申报或服务端权限。

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
