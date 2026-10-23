<script setup>
import {computed,ref,watch} from 'vue'
import {useRouter} from 'vue-router'
import {SHEETS,CATEGORIES,STATUSES,BUCKETS,sheetById} from './schema.js'
import {seed,data,context,ledger,downloadFile,resetDemo,selectedVessels,vesselScopeLabel,singleVesselId,applyVesselScope} from './store.js'
import {money,sub,sum,mul} from './decimal.js'
import {totals} from './engine.js'
import {fieldsForView,rowsForSheet,expenseRows,summaryRows,rawTable,estimateRows,inventoryMonths,inventoryValues,csv} from './views.js'
import {ORIGINAL_VESSEL_ID,scopeData,vesselFields,vesselById} from './vessels.js'
import LedgerTable from './components/LedgerTable.vue'
import EntryDialog from './components/EntryDialog.vue'
import AuxDialog from './components/AuxDialog.vue'
import DetailDialog from './components/DetailDialog.vue'
const props=defineProps({sheetId:{type:String,required:true}})
const router=useRouter()
const sheet=computed(()=>sheetById(props.sheetId))
const metrics=computed(()=>totals(seed,data,context.vesselScope))
const summaries=computed(()=>summaryRows(seed,data,context.vesselScope))
const query=ref(''),start=ref(''),end=ref(''),status=ref(''),scope=ref('all'),codeGroup=ref('ship_management')
const detail=ref(null),entryDialog=ref(null),auxDialog=ref(null),auditOpen=ref(false),resetOpen=ref(false),localError=ref('')
const month=ref(seed.asOf.slice(0,7))
const scopedData=computed(()=>scopeData(data,context.vesselScope))
const hasOriginal=computed(()=>selectedVessels.value.some(v=>v.id===ORIGINAL_VESSEL_ID))
const scopeNote=computed(()=>metrics.value.hasUnimported?'包含未导入历史的船舶，仅计其本次登记净额':'含各船独立历史基线')
const inventoryByVessel=computed(()=>selectedVessels.value.map(v=>({...vesselFields(data,v.id),...inventoryValues(data,month.value,seed,v.id),id:v.id})))
const inventorySingle=computed(()=>inventoryByVessel.value.length===1)
const inventory=computed(()=>{
 const rows=inventoryByVessel.value
 if(rows.length===1)return rows[0]
 const result={vesselId:'',month:month.value,rmbRate:null,note:'多船合计以 USD 展示，人民币折算请查看各船明细。',cash:rows.flatMap(r=>r.cash)}
 for(const key of ['openingCash','cashClosing','foodIncome','foodGuestMealIncome','foodHospitalityIncome','foodCrewIncome','foodPurchases','foodSpend','openingFood','foodClosing','foodIncomeTotal','foodExpense','foodBalance','storeIncome','storeCrewIncome','storeCrewSpend','storeGuestSpend','storeSalesSpend','storePurchases','storeSpend','openingStore','storeClosing','storeIncomeTotal','storeExpense','storeBalance'])result[key]=sum(rows.map(r=>r[key]))
 return result
})
const scopedAudit=computed(()=>data.audit.filter(a=>!['owner','ownership','crew','crewAssignment'].includes(a.action)&&(!a.vesselId||selectedVessels.value.some(v=>v.id===a.vesselId))))
const vesselColumns=[{key:'vesselName',label:'船名',type:'text',width:'180px'},{key:'imo',label:'IMO',type:'text',width:'95px'}]
const months=computed(()=>[...new Set([seed.asOf.slice(0,7),month.value,...inventoryMonths(seed,data,context.vesselScope)])].sort().reverse())
const financial=computed(()=>['expenses','category','bank','receipts','cash'].includes(sheet.value.kind))
const auxTable=computed(()=>['analysis','codes'].includes(sheet.value.kind))
const sourceGrid=computed(()=>rawTable(seed,sheet.value.name))
const rows=computed(()=>{
 if(financial.value)return rowsForSheet(seed,data,sheet.value,context.vesselScope)
 if(sheet.value.kind==='analysis')return estimateRows(seed,data,context.vesselScope)
 if(sheet.value.kind==='codes')return data.codes.filter(c=>c.namespace===codeGroup.value).map(c=>({...c,id:`${c.namespace}:${c.code}`,isSource:!data.audit.some(a=>a.action==='code'&&(a.entityId===`${c.namespace}:${c.code}`||a.entityId===c.code)),sourceRef:c.source_cell?`Account Code-2版!${c.source_cell}`:'本次新增'}))
 return []
})
const columns=computed(()=>{
 if(financial.value)return [...vesselColumns,...fieldsForView(seed,sheet.value)]
 if(sheet.value.kind==='analysis')return [...vesselColumns,...[['description','类型'],['rqa','RQA'],['supplier','供应商'],['po','PO Nos'],['originalAmount','原币金额'],['rating','汇率除数'],['usd','USD'],['catalogue','Catalogue'],['agreement','Agreement'],['place','Place'],['overtime','O/T'],['low','Lowest'],['reasonable','Reasonable'],['high','Highest']].map(([key,label],i)=>({key,label,column:String.fromCharCode(66+i),type:['originalAmount','rating','usd','place','overtime','low','reasonable','high'].includes(key)?'decimal':'text'}))]
 if(sheet.value.kind==='codes')return [{key:'code',label:'Account Code',type:'text'},{key:'description',label:codeGroup.value==='ship_management'?"Ship’s Account Description":'Description',type:'text'},{key:codeGroup.value==='ship_management'?'pic':'chinese_description',label:codeGroup.value==='ship_management'?'PIC 责任部门':'中文名称',type:'text'}]
 return []
})
const filteredRows=computed(()=>rows.value.filter(r=>{
 if(scope.value==='source'&&!r.isSource)return false
 if(scope.value==='new'&&r.isSource)return false
 if(query.value&&!Object.values(r).map(String).join(' ').toLowerCase().includes(query.value.toLowerCase()))return false
 const date=r.date||r.posting_date||''
 if(start.value&&String(date).slice(0,10)<start.value)return false
 if(end.value&&String(date).slice(0,10)>end.value)return false
 if(status.value&&(r.payment_status||r.receipt_status)!==status.value)return false
 return true
}))
const summaryColumns=[{key:'name',label:'分类',type:'text',width:'220px'},{key:'receipt',label:'实际收款 USD',type:'decimal',width:'150px'},{key:'amount',label:'费用总额 USD',type:'decimal',width:'150px'},{key:'paidWithFee',label:'已付含手续费',type:'decimal',width:'150px'},{key:'unpaid',label:'待付费用',type:'decimal',width:'150px'},{key:'balance',label:'收款减费用',type:'decimal',width:'150px'}]
const checkingColumns=[{key:'name',label:'Description',type:'text',width:'210px'},{key:'amount',label:'Amount (USD)',type:'decimal'},...STATUSES.map((s,i)=>({key:BUCKETS[i],label:s,type:'decimal'})),{key:'fee',label:'Bank Charge',type:'decimal'},{key:'creditAccrual',label:'C/N Accrual',type:'decimal'},{key:'creditProfit',label:'C/N Profit',type:'decimal'}]
const checkingRows=computed(()=>summaries.value.map(r=>{
 const rows=expenseRows(seed,data,sheetById(r.id),context.vesselScope)
 return {...r,sourceRef:CATEGORIES.find(c=>c.id===r.id).name,isSource:true,originLabel:hasOriginal.value?'原表＋本次':'本次登记',unpaid:sub(r.amount,r.completed),creditAccrual:sum(rows.map(e=>e.credit_note_accrual_usd||'0')),creditProfit:sum(rows.map(e=>e.credit_note_profit_usd||'0')),...Object.fromEntries(r.buckets.map((v,i)=>[BUCKETS[i],v]))}
}))
const newCount=computed(()=>scopedData.value.entries.filter(e=>!e.voided).length)
const voidCount=computed(()=>scopedData.value.entries.filter(e=>e.voided).length)
const tableTitle=computed(()=>({expenses:'费用总清单',category:'分类费用明细',receipts:'收款及五类用途分配',bank:'账户收支记录',cash:'备用金收支记录',analysis:'估算明细与参数',codes:'编码明细'})[sheet.value.kind])
const hints={sofp:'沿用原表的资金与费用口径，查看当前余额及五类费用构成。','cost-checking':'按原表状态和分类核对费用，点击分类查看组成明细。',bank:'实际收付款自动带入。未付款的费用不会改变账户余额。',receipts:'保留船管、接船、换旗、船东费用和坞修五类收款分配。',expenses:'每笔新费用只录入一次，再按分类出现在相应分表。',ctm:'备用金补给与消费分开记录，现金消费同时关联对应费用。',shipmanagement:'船舶管理相关费用，保留原表全部业务字段。',owner:'代船东发生的费用及原表收取状态。',takeover:'交接船期间发生的费用和对应收付款。',flag:'BMA 换旗相关费用、原票与附件。',drydock:'坞修相关费用，沿用 DD Cost 的列与字段。',analysis:'沿用原表估算输入及计算规则，估算不会产生实际收付款。',codes:'船管编码与船员细项分别维护，用于记账时选择。',inventory:'按月查看备用金、伙食与招待品的收支及结余。'}
watch(()=>sheet.value.id,()=>{query.value='';start.value='';end.value='';status.value='';scope.value='all';detail.value=null;entryDialog.value=null;auxDialog.value=null})
function addEntry(){entryDialog.value={}}
function detailRow(row){
 if(sheet.value.kind==='inventory'&&!row.entryId&&row.vesselId){applyVesselScope([row.vesselId]);return}
 if(context.role==='finance'&&sheet.value.kind==='codes'&&/^\d+$/.test(row.code)){auxDialog.value={kind:'code',initial:{...row,originalKey:`${row.namespace}:${row.code}`}};return}
 if(context.role==='finance'&&sheet.value.kind==='analysis'){auxDialog.value={kind:'estimate',initial:{...row,originalAmount:row.originalAmount??'0',rating:row.rating??'1'}};return}
 detail.value=row
}
function edit(e){detail.value=null;entryDialog.value={entry:e}}
function payment(e){detail.value=null;entryDialog.value={paymentEntry:e}}
function voidEntry(e){detail.value=null;auxDialog.value={kind:'void',initial:{id:e.id,reason:''}}}
function copySource(row){detail.value=null;entryDialog.value={sourceRow:row}}
function addAux(){
 if(sheet.value.kind==='codes')auxDialog.value={kind:'code',initial:{namespace:codeGroup.value,code:'',description:'',chinese_description:'',pic:''}}
 if(sheet.value.kind==='analysis')auxDialog.value={kind:'estimate',initial:{vesselId:singleVesselId.value,description:'',originalAmount:'0',rating:'1',catalogue:'Shipowner',agreement:'Take-over',place:'0',overtime:'0',reasonable:''}}
 if(sheet.value.kind==='inventory')auxDialog.value={kind:'inventory',initial:{month:month.value,vesselId:singleVesselId.value}}
}
function exportTable(){
 let c=columns.value,r=filteredRows.value
 if(['summary','checking'].includes(sheet.value.kind)){
  c=[{key:'vesselScopeName',label:'统计船舶'},{key:'vesselScopeImo',label:'IMO范围'},...(sheet.value.kind==='summary'?summaryColumns:checkingColumns)]
  r=checkingRows.value.map(row=>({...row,vesselScopeName:selectedVessels.value.map(v=>v.name).join('；'),vesselScopeImo:selectedVessels.value.map(v=>v.name+'：'+(v.imo||'未填写')).join('；')}))
 }
 if(sheet.value.kind==='inventory'){
  c=[...vesselColumns,{key:'month',label:'月份'},{key:'cashClosing',label:'月末现金 USD'},{key:'foodIncomeTotal',label:'伙食收入 USD'},{key:'foodExpense',label:'伙食支出 USD'},{key:'foodBalance',label:'伙食结余 USD'},{key:'storeIncomeTotal',label:'招待品收入 USD'},{key:'storeExpense',label:'招待品支出 USD'},{key:'storeBalance',label:'招待品结余 USD'}]
  r=inventoryByVessel.value.map(row=>({...row,month:month.value}));if(!inventorySingle.value)r.push({...inventory.value,vesselName:'所选船舶合计',imo:''})
 }
 downloadFile(new Blob([csv(c,r)],{type:'text/csv;charset=utf-8'}),`${sheet.value.name}-${sheet.value.kind==='codes'?'公共编码':vesselScopeLabel.value}.csv`)
}
async function doReset(){try{localError.value='';await resetDemo();resetOpen.value=false}catch(e){localError.value=e.message}}
const pendingEntries=computed(()=>scopedData.value.entries.filter(e=>!e.voided&&Number(ledger.pending(e))>0))
const linkedId=ref('')
function linkExisting(){const e=data.entries.find(e=>e.id===linkedId.value);if(e&&selectedVessels.value.some(v=>v.id===e.vesselId))entryDialog.value={paymentEntry:e}}
watch(()=>JSON.stringify(context.vesselScope),()=>{detail.value=null;entryDialog.value=null;auxDialog.value=null;linkedId.value=''})
function jumpCategory(row){router.push('/sheets/'+row.id)}
const foodLines=computed(()=>[['本期收入 · 伙食费',inventory.value.foodIncome],['客饭费',inventory.value.foodGuestMealIncome],['招待用伙食',inventory.value.foodHospitalityIncome],['船员购伙',inventory.value.foodCrewIncome],['收入合计',inventory.value.foodIncomeTotal],['本期支出 · 购入伙食',inventory.value.foodPurchases],['已关联现金伙食支出',inventory.value.foodSpend],['上期库存',inventory.value.openingFood],['本期库存',inventory.value.foodClosing],['支出合计',inventory.value.foodExpense],['本月应发放伙食费 / 结余',inventory.value.foodBalance]])
const storeLines=computed(()=>[['本期收入 · 购买招待品',inventory.value.storeIncome],['船员购买收入',inventory.value.storeCrewIncome],['收入合计',inventory.value.storeIncomeTotal],['本期支出 · 招待船员',inventory.value.storeCrewSpend],['招待客人',inventory.value.storeGuestSpend],['船员购买支出',inventory.value.storeSalesSpend],['其他支出',inventory.value.storePurchases],['已关联现金招待品支出',inventory.value.storeSpend],['上期库存',inventory.value.openingStore],['本期库存',inventory.value.storeClosing],['支出合计',inventory.value.storeExpense],['本月 Bound Store 平衡',inventory.value.storeBalance]])
</script>
<template>
 <main class="worksheet-page">
  <div class="page-heading"><div><span class="eyebrow">WORKBOOK / {{String(SHEETS.findIndex(s=>s.id===sheet.id)+1).padStart(2,'0')}}</span><h1>{{sheet.name}}</h1><p>{{hints[sheet.id]}}</p></div><div class="page-actions"><button class="secondary" @click="auditOpen=true">操作记录 <span>{{scopedAudit.length}}</span></button><button class="secondary" @click="exportTable">导出当前表 ↗</button><button v-if="financial||['summary','checking'].includes(sheet.kind)" class="primary" :disabled="context.role!=='finance'" @click="addEntry">＋ 记一笔账</button><button v-if="auxTable||sheet.kind==='inventory'" class="primary" :disabled="context.role!=='finance'" @click="addAux">＋ {{sheet.kind==='codes'?'新增编码':sheet.kind==='analysis'?'新增估算':'维护本月资料'}}</button></div></div>
  <div class="worksheet-meta"><span class="source-label">EXCEL DEMO</span><span>{{sheet.kind==='codes'?'公共费用编码 · 各船共用':vesselScopeLabel+' · '+(hasOriginal?'含原表快照 '+seed.asOf:(newCount?'未导入历史 · 本次记录':'空账本，未导入历史'))}}</span><span>{{newCount}} 笔本次录入</span><button v-if="voidCount" class="text-button" @click="auditOpen=true">{{voidCount}} 笔已作废</button><button class="text-button reset-button" :disabled="context.role!=='finance'" @click="resetOpen=true">恢复 Demo 底稿</button></div>
  <div v-if="context.role==='reader'" class="readonly-banner"><span>◉</span> 当前为只读查看身份，可查询和导出；录入、修改及资料维护仅限财务。</div>
  <section class="metrics-strip" v-if="['summary','checking','bank','cash','inventory'].includes(sheet.kind)">
   <router-link to="/sheets/receipts"><span>累计已分配收款 <small>USD</small></span><strong>{{money(metrics.funds)}}</strong><small>Shipmanagement RCVD ↗</small></router-link>
   <router-link to="/sheets/bank"><span>{{metrics.hasUnimported?'银行已知余额及登记净额':'银行账户余额'}} <small>USD</small></span><strong>{{money(metrics.bank)}}</strong><small>本次变动 {{money(metrics.bankChange)}} ↗</small></router-link>
   <router-link to="/sheets/ctm"><span>{{metrics.hasUnimported?'备用金已知余额及登记净额':'船长备用金'}} <small>USD</small></span><strong>{{money(metrics.cash)}}</strong><small>本次变动 {{money(metrics.cashChange)}} ↗</small></router-link>
   <div class="difference-metric"><span>{{metrics.hasUnimported?'已知记录资金差额':'资金平衡差额'}} <small>USD</small></span><strong>{{money(metrics.difference)}}</strong><small>{{scopeNote}}</small></div>
  </section>
  <template v-if="sheet.kind==='summary'||sheet.kind==='checking'">
   <section class="sheet-panel"><div class="panel-heading"><div><span class="eyebrow">{{sheet.kind==='summary'?'COST POSITION':'COST CHECKING'}}</span><h2>{{sheet.kind==='summary'?'五类资金与费用':'费用及原表状态核对'}}</h2></div><span>点击分类查看明细 ↗</span></div><LedgerTable :columns="sheet.kind==='summary'?summaryColumns:checkingColumns" :rows="checkingRows" :compact="true" @detail="jumpCategory" action-label="查看分类"/><div class="panel-note">费用总额与已支付金额分别展示。原表中的重复视图不相加；新录入账目按分类分配。</div></section>
   <div class="summary-bottom"><section class="sheet-panel compact-panel"><span class="eyebrow">CURRENT ENTRIES</span><h2>本次录入</h2><div class="small-stat"><span>有效账目</span><strong>{{newCount}} 笔</strong></div><div class="small-stat"><span>本次新增待付</span><strong>{{money(metrics.pending)}} USD</strong></div><div class="small-stat"><span>本次实际银行变动</span><strong>{{money(metrics.bankChange)}} USD</strong></div><router-link class="text-link" to="/sheets/expenses">打开全部费用清单 ↗</router-link></section><section class="sheet-panel compact-panel"><span class="eyebrow">HOW TO RECORD</span><h2>录入一笔完整的账</h2><ol class="workflow-mini"><li><span>01</span>选择入账或出账</li><li><span>02</span>填写原表字段与分类</li><li><span>03</span>确认预览，再确认录入</li></ol><button class="text-button" :disabled="context.role!=='finance'" @click="addEntry">开始记账 →</button></section></div>
  </template>
  <template v-if="financial||auxTable">
   <div v-if="sheet.kind==='codes'" class="segmented"><button :class="{active:codeGroup==='ship_management'}" @click="codeGroup='ship_management'">Ship Management 船管编码</button><button :class="{active:codeGroup==='crew_detail'}" @click="codeGroup='crew_detail'">Crew Dept 船员细项</button></div>
   <div class="table-toolbar"><label class="search-input"><span>⌕</span><input aria-label="搜索当前分表" placeholder="搜索摘要、供应商、编号…" v-model="query"></label><select aria-label="记录来源" v-model="scope"><option value="all">全部记录</option><option value="source">Excel 样例</option><option value="new">本次录入 / 修改</option></select><template v-if="financial"><label class="date-filter"><input aria-label="开始日期" type="date" v-model="start"><span>至</span><input aria-label="结束日期" type="date" v-model="end"></label><select v-if="sheet.kind!=='bank'" aria-label="状态筛选" v-model="status"><option value="">全部状态</option><option v-for="s in STATUSES">{{s}}</option></select></template><button v-if="query||start||end||status||scope!=='all'" class="text-button" @click="query='';start='';end='';status='';scope='all'">清除筛选</button></div>
   <section class="sheet-panel"><div class="panel-heading"><div><h2>{{tableTitle}}</h2><p>保留原表列顺序 · {{filteredRows.length}} 条记录</p></div><span>{{auxTable&&context.role==='finance'?'点击维护，预览后确认保存':'表头固定，可横向滚动 →'}}</span></div><LedgerTable :columns="columns" :rows="filteredRows" :compact="sheet.kind==='codes'" :action-label="auxTable&&context.role==='finance'?'维护':'详情'" @detail="detailRow"/><div class="panel-note"><span v-if="sheet.kind==='bank'">各船账户独立计算逐笔余额 · USD。所选历史基线 {{money(metrics.baseline.bank)}}，本次变动 {{money(metrics.bankChange)}}，已知余额及登记净额 {{money(metrics.bank)}}。{{scopeNote}}</span><span v-else-if="sheet.kind==='cash'">补给不算费用；消费按已关联的现金支付记录展示。本次现金变动 {{money(metrics.cashChange)}} USD。</span><span v-else-if="sheet.kind==='analysis'">原表估算采用除法折算；地区与加班参数保留，尚未设定的合理值保持空白。</span><span v-else>Excel 样例保留原始行及缺失值。本次录入使用统一编号，在总表与分类页同步展示。</span></div></section>
   <section v-if="sheet.kind==='bank'&&pendingEntries.length&&context.role==='finance'" class="bank-link-panel"><div><strong>已有账目需要收付款？</strong><p>关联原账目登记，银行自动带入，无需再新增一笔费用。</p></div><select aria-label="选择已有账目" v-model="linkedId"><option value="">选择未收付清的账目</option><option v-for="e in pendingEntries" :value="e.id">{{vesselById(data,e.vesselId)?.name}} · {{e.id}} · {{e.fields.description}} · 剩余 {{money(ledger.pending(e))}}</option></select><button class="primary" :disabled="!linkedId" @click="linkExisting">关联并登记</button></section>
  </template>
  <template v-if="sheet.kind==='inventory'">
   <section v-if="!inventorySingle" class="sheet-panel vessel-inventory-summary"><div class="panel-heading"><div><h2>各船月度明细 · USD</h2><p>点击一行进入单船查看与维护</p></div></div><LedgerTable :columns="[...vesselColumns,{key:'cashClosing',label:'月末现金 / 登记净额',type:'decimal'},{key:'foodBalance',label:'伙食结余',type:'decimal'},{key:'storeBalance',label:'招待品结余',type:'decimal'}]" :rows="inventoryByVessel" :compact="true" action-label="查看单船" @detail="detailRow"/></section>
   <div class="inventory-toolbar"><label>选择月份<select aria-label="选择月份" v-model="month"><option v-for="m in months">{{m}}</option></select></label><input aria-label="跳转月份" type="month" v-model="month"><span>月末现金 <strong>{{money(inventory.cashClosing)}} USD</strong></span></div>
   <section class="sheet-panel"><div class="panel-heading"><div><h2>轮备用金流水账</h2><p>期初 / 基线 {{money(inventory.openingCash)}} USD · {{month}}</p></div><button class="text-button" :disabled="context.role!=='finance'" @click="addEntry">登记收支 ↗</button></div><LedgerTable :compact="true" :columns="[...vesselColumns,{key:'date',label:'日期'},{key:'description',label:'摘要'},{key:'direction',label:'入账 / 出账'},{key:'change',label:'现金变动 USD',type:'decimal'}]" :rows="inventory.cash" @detail="detailRow" empty="这个月尚无本次演示录入的备用金收支"/><div class="panel-note">月末现金 {{money(inventory.cashClosing)}} USD · 记录自动关联 CTM Expenses List。</div></section>
   <div class="inventory-panels"><section class="sheet-panel"><div class="panel-heading"><h2>本月伙食费收支一览表</h2><span>{{month}}</span></div><table class="monthly-table"><thead><tr><th>项目</th><th v-if="inventorySingle">参考折算 RMB</th><th>合美元 USD</th></tr></thead><tbody><tr v-for="([label,value],i) in foodLines" :class="{total:i===foodLines.length-1||label.includes('合计')}"><td>{{label}}</td><td v-if="inventorySingle">{{money(mul(value,inventory.rmbRate))}}</td><td>{{money(value)}}</td></tr></tbody></table><div class="panel-note">原表：支出＝采购＋上期库存−本期库存；结余＝收入−支出。已关联现金支出只计一次。</div></section><section class="sheet-panel"><div class="panel-heading"><h2>本月 Bound Store 费用</h2><span>{{month}}</span></div><table class="monthly-table"><thead><tr><th>项目</th><th v-if="inventorySingle">参考折算 RMB</th><th>合美元 USD</th></tr></thead><tbody><tr v-for="([label,value],i) in storeLines" :class="{total:i===storeLines.length-1||label.includes('合计')}"><td>{{label}}</td><td v-if="inventorySingle">{{money(mul(value,inventory.rmbRate))}}</td><td>{{money(value)}}</td></tr></tbody></table><div class="panel-note">沿用原表 U27 的加总口径，库存按所填符号参与；月度输入不生成银行流水。</div></section></div>
   <div class="sheet-note">{{inventory.note||'尚未补充月度备注。财务可点击“维护本月资料”填写原表项目。'}}</div>
  </template>
  <details class="original-grid" v-if="hasOriginal&&['summary','checking','inventory','analysis'].includes(sheet.kind)"><summary>查看 {{vesselById(data,ORIGINAL_VESSEL_ID)?.name}} 的 Excel 原始底稿 <span>原始单元格与异常保留，只读展示</span></summary><LedgerTable :columns="sourceGrid.columns" :rows="sourceGrid.rows" :compact="true" :actions="false"/></details>
  <div class="worksheet-end"><span>{{seed.sourceName}}</span><span>{{vesselScopeLabel}} · 数据只保存在当前浏览器 · Excel 原件不会被修改</span></div>
 </main>
 <EntryDialog v-if="entryDialog" :sheet="sheet" v-bind="entryDialog" @close="entryDialog=null"/>
 <AuxDialog v-if="auxDialog" v-bind="auxDialog" @close="auxDialog=null"/>
 <DetailDialog v-if="detail" :row="detail" :columns="columns" @close="detail=null" @edit="edit" @payment="payment" @void="voidEntry" @copy="copySource"/>
 <div v-if="auditOpen" class="modal-backdrop" @click.self="auditOpen=false"><section class="dialog detail-dialog" role="dialog" aria-modal="true" aria-label="操作记录"><header class="dialog-header"><div><span class="eyebrow">LOCAL AUDIT TRAIL</span><h2>操作记录</h2><p>保留本次演示的录入、修改、收付款和作废记录</p></div><button class="icon-button" aria-label="关闭" @click="auditOpen=false">×</button></header><div class="dialog-body"><p v-if="!scopedAudit.length" class="empty-state">暂无本次演示操作，开始记一笔账后可在这里追溯。</p><article v-for="log in scopedAudit" :key="log.id" class="audit-row"><strong>{{({entry:'录入账目',edit:'修改账目',payment:'登记收付款',void:'作废账目',code:'维护编码',estimate:'维护估算',inventory:'维护月度资料',vessel:'维护船舶档案'})[log.action]}} · {{log.entityId}}</strong><small>{{new Date(log.at).toLocaleString('zh-CN')}} · 财务 · {{log.vesselId?(vesselById(data,log.vesselId)?.name||'船舶档案'):'公共资料'}}</small><p>{{log.sheets.join(' · ')}}</p><details><summary>查看完整信息</summary><div class="audit-diff"><pre v-if="log.before">修改前 {{JSON.stringify(log.before,null,2)}}</pre><pre>保存后 {{JSON.stringify(log.after,null,2)}}</pre></div></details></article></div><footer class="dialog-footer"><span>不包含旧版浏览器数据</span><button class="secondary" @click="auditOpen=false">关闭</button></footer></section></div>
 <div v-if="resetOpen" class="modal-backdrop" @click.self="resetOpen=false"><section class="dialog reset-dialog" role="dialog" aria-modal="true" aria-label="恢复Demo底稿"><header class="dialog-header"><h2>恢复 Demo 底稿</h2><button class="icon-button" aria-label="关闭" @click="resetOpen=false">×</button></header><div class="dialog-body"><p>清除本版新增船舶、账目、收付款、附件及资料修改，恢复为 Excel 示例。旧版数据及 Excel 原件保持不变。</p><div v-if="localError" class="error-message">{{localError}}</div></div><footer class="dialog-footer"><button class="secondary" @click="resetOpen=false">取消</button><button class="danger-button" :disabled="context.role!=='finance'" @click="doReset">确认恢复 Demo</button></footer></section></div>
</template>
