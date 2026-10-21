MSTS 八模块财务原型封存版
封存日期：2026-10-20
版本标签：archive/full-finance-20261020

直接打开 index.html 使用旧版；analysis-report.html 为原始分析报告。
source.zip 保存封存时的源码、Excel、依赖锁文件、构建产物及文档，不含 node_modules。
源码解压后执行 npm --prefix prototype ci，再执行 npm --prefix prototype run dev。
documents 保存原操作说明、覆盖清单及预算等交付文件。
校验：旧版33项测试、Vite构建及离线打包检查通过。
新版本不会读取或清除旧版浏览器本地数据库。
