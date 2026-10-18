exec((__import__('pathlib').Path(__file__).parent/'analyze.py').read_text())

COMMON=[
('posting_date','入账日期','date','员工录入','凭证所属期间；独立于发票、付款及银行价值日'),
('description','类型/摘要','text','员工录入','业务描述；原表类型列是自由摘要，不是可靠的费用归属分类'),
('requisition_no','RQA','text','采购录入','请购/申请编号；不能单凭编号假定唯一业务'),
('supplier_id','Supplier','reference','员工选择','往来方主数据；同名大小写及空格差异需归并'),
('purchase_order_no','PO Nos','text','采购录入','采购订单编号；与订单行、发票行、付款分摊关联'),
('approval_attachment','Pay. Approval','attachment','审批上传','付款申请/订单批准材料，原表多为文件名'),
('original_amount','PO Current','decimal','员工录入','原币订单金额；原表未提供独立币种列，应新增 currency_code'),
('usd_conversion_rate','Rating','decimal','员工录入/汇率表','费用表以原币金额乘汇率得到USD；分析页却使用除法，必须保留汇率方向'),
('purchase_order_usd','PO Amount (USD)','decimal','计算或历史覆盖','原币金额×每单位原币折USD汇率；历史存在直接填写，不能强制抹平'),
('account_code','Account Code','reference','员工选择','费用科目；主表编码与船员细项编码分命名空间'),
('goods_received_date','GRN/Date','date','员工录入','收货/验收日期，部分是文本日期，迁移须清洗并保留原文'),
('goods_received_usd','GRN Amount(USD)','decimal','员工录入/计算','实际收货额，可不同于订单及发票金额'),
('invoice_usd','Invoice Amount(USD)','decimal','员工录入/计算','发票金额；不是所有行都等于订单/收货额'),
('credit_note_accrual_usd','C/N,Accural','decimal','员工录入','贷项/应计调整额；原表为零或空，未建立可靠抵扣规则，需确认方向'),
('credit_note_profit_usd','C/N Profit','decimal','员工录入','贷项利润字段；本期未使用，语义需确认'),
('profit_usd','Profit','decimal','员工录入/待定','本期汇总零；不可据此定义整个系统利润计算规则'),
('invoice_date','Invoice Date','date','员工录入','发票日期'),
('due_date','Due Date','date','员工录入/账期计算','应付到期日；用于账龄，但原表没有按截止日过滤的账龄公式'),
('payment_status','Payment Status','enum','流程驱动/历史导入','Accrual、Receiving、Received、Approved、Paying、Completed；缺失状态不得静默排除'),
('bank_fee_usd','Bank Charge','decimal','员工录入/银行匹配','费用端手续费；与银行费用核对，不能重复入账；退款可出现负数'),
('bank_slip','Bank Slip','attachment','付款上传','银行回单文件名/超链接；文件内容未随表提供'),
('invoice_attachment','Attachement/Invoices','attachment','员工上传','发票附件，可多份；原表只有文件名不等于附件已归档'),
('credit_note_attachment','Attachement/Credit Note','attachment','员工上传','贷项或补充附件，原表拼写及列位置不一致'),
]
FIELDS={x[0]:dict(field=x[0],label=x[1],type=x[2],entry=x[3],meaning=x[4]) for x in COMMON}
EXTRA={
'accrual_bucket':('应计状态金额','decimal','状态计算','原表多数取发票金额；CTM Accrual取订单USD额'),
'receiving_bucket':('待收货/处理中金额','decimal','状态计算','原表多数取发票金额；CTM Receiving取GRN金额；英文含义需财务确认'),
'received_bucket':('Received状态金额','decimal','状态计算','按原表状态取发票额；Received不是银行已收款'),
'approved_bucket':('已批准金额','decimal','状态计算','状态为Approved取相应金额，否则空文本'),
'paying_bucket':('支付中金额','decimal','状态计算','状态为Paying取相应金额，否则空文本'),
'completed_bucket':('完成金额','decimal','状态计算','状态为Completed取发票额；不自动证明已经与银行核销'),
'owner_settlement_amount':('船东结算统计额','decimal','状态计算/历史保留','非船东付且非待收时取发票或GRN金额；空状态也会被计入，不能直接称实际收款'),
'owner_settlement_status':('船东结算状态/备注','enum','员工录入/收款核销','已收、待收、船东付等；与供应商付款状态独立'),
'owner_pending_placeholder':('待收展示/辅助','decimal','历史原样','原表多数仅表头和手工合计，不能直接作客户应收明细'),
'owner_paid_placeholder':('船东付展示/辅助','decimal','历史原样','通过结算状态记录实际支付主体；原表该列多数空'),
'cash_direction':('CTM现金方向','enum','员工录入','In/out；原表另以金额正负实现加减，必须同时校验'),
'ctm_other':('CTM Others','decimal','员工录入/待确认','原表全零汇总，需确认费用分组的业务定义'),
'ctm_food':('CTM Food','decimal','员工录入','伙食分组字段，原表全零'),
'ctm_store':('CTM Store','decimal','员工录入','库房/招待品分组字段，原表全零'),
'receipt_type':('收款摘要/资金用途','text','员工录入','拨款、代付回款、顾问费等需要不同业务类型，不能全部视作营业收入'),
'receipt_status':('收款流程状态','enum','流程驱动','原表列名RQA实际填Completed等状态，与费用页RQA编号含义不同'),
'receipt_party':('付款方/来源','reference','员工选择','原表名Supplier，收款场景应保存付款方'),
'receipt_original_amount':('收款原币/申请额','decimal','员工录入','包括实际收款、待申请负差额及计划155000，需按业务类型区分'),
'shipmanagement_receipt':('船管资金分配额USD','decimal','收款分配','I列，仅该分配列参与船管收款合计'),
'takeover_receipt':('接船资金分配额USD','decimal','收款分配','J列'),
'bma_receipt':('换旗资金分配额USD','decimal','收款分配','K列'),
'owner_receipt':('船东费用资金分配额USD','decimal','收款分配','L列'),
'dd_receipt':('坞修资金分配额USD','decimal','收款分配','M列'),
'receipt_date':('收款确认日期','date','员工录入/银行匹配','原表N列有时复制入账日期，有时手工日期'),
'receipt_fee':('收款手续费USD','decimal','银行匹配','O列；部分分配金额已扣费，应避免重复扣除'),
'receipt_attachment':('收款回单附件','attachment','员工上传','P列标题Bank Charge但实际是回单文件名'),
'supplemental_attachment':('补充附件','attachment','员工上传','原表仅标注Attachement，未统一文件类型，应支持通用附件及分类'),
}
for k,v in EXTRA.items():FIELDS[k]=dict(field=k,label=v[0],type=v[1],entry=v[2],meaning=v[3])
base=[x[0] for x in COMMON]
buckets=['accrual_bucket','receiving_bucket','received_bucket','approved_bucket','paying_bucket','completed_bucket']
maps={}
maps['Expenses Lists']=dict(zip([get_column_letter(i) for i in range(1,30)],base+buckets))
# Most category pages omit the extra W attachment column, moving status buckets left.
for sh in ['Shipmanagement Cost','Owner Cost','Take-Over Cost']:
    maps[sh]=dict(zip([get_column_letter(i) for i in range(1,29)],base[:22]+buckets))
for sh in ['Owner Cost','Take-Over Cost']:
    maps[sh].update(dict(zip(['AC','AD','AE','AF'],['owner_settlement_amount','owner_settlement_status','owner_pending_placeholder','owner_paid_placeholder'])))
maps['BMA Flag Change']=dict(zip([get_column_letter(i) for i in range(1,30)],base+buckets))
maps['BMA Flag Change'].update(U='supplemental_attachment',V='bank_slip',W='invoice_attachment',AD='owner_settlement_amount',AE='owner_settlement_status',AF='owner_pending_placeholder',AG='owner_paid_placeholder')
dd=[k for k in base if k not in ['approval_attachment']]
# DD has only 21 business columns; F begins the original amount.
dd=['posting_date','description','requisition_no','supplier_id','purchase_order_no','original_amount','usd_conversion_rate','purchase_order_usd','account_code','goods_received_date','goods_received_usd','invoice_usd','credit_note_accrual_usd','credit_note_profit_usd','profit_usd','invoice_date','due_date','payment_status','bank_fee_usd','invoice_attachment','credit_note_attachment']
maps['DD Cost']=dict(zip([get_column_letter(i) for i in range(1,28)],dd+buckets))
maps['DD Cost'].update(AB='owner_settlement_amount',AC='owner_settlement_status',AD='owner_pending_placeholder',AE='owner_paid_placeholder')
ctm=['posting_date','description','cash_direction','supplier_id','purchase_order_no','original_amount','usd_conversion_rate','purchase_order_usd','account_code','goods_received_date','goods_received_usd','invoice_usd','ctm_other','ctm_food','ctm_store','invoice_date','due_date','payment_status','bank_fee_usd','invoice_attachment','credit_note_attachment']
maps['CTM Expenses List']=dict(zip([get_column_letter(i) for i in range(1,28)],ctm+buckets))
maps['Shipmanagement RCVD']=dict(zip([get_column_letter(i) for i in range(2,17)],['posting_date','receipt_type','receipt_status','receipt_party','purchase_order_no','receipt_original_amount','usd_conversion_rate','shipmanagement_receipt','takeover_receipt','bma_receipt','owner_receipt','dd_receipt','receipt_date','receipt_fee','receipt_attachment']))
fields=[]
for sh,mp in maps.items():
    for col,key in mp.items():
        fields.append(dict(sheet=sh,column=col,header_cell=col+'1',source_header=value(sh,col+'1'),**FIELDS[key]))
special_fields=[
('Bank Verification','B12:B35','sequence','银行流水序号','integer','银行导入','稳定流水编号；不能用可变行号代替正式流水ID'),
('Bank Verification','C12:C35','bank_date','银行日期','date','银行导入','原表有未按日期排序的行，余额按行链计算'),
('Bank Verification','D12:D35','currency','币种','enum','银行导入','USD/HKD/EUR字典，实际明细目前USD'),
('Bank Verification','E12:E35','account_no','账户号','text','银行导入','原表为数字，平台需保存为文本标识'),
('Bank Verification','F12:F35','bank_direction','入账/出账/结息','enum','银行导入','现有IF只识别入账，其他都作出账；结息分支缺失'),
('Bank Verification','G12:G35','bank_gross','银行毛额','decimal','银行导入','主金额，手续费单列；G30为空但H30有50费用'),
('Bank Verification','H12:H35','bank_fee','银行手续费','decimal','银行导入','正负及承担方须区分，退款方向例外见I15'),
('Bank Verification','I12:I35','bank_movement','本笔余额变动额','decimal','计算/历史覆盖','入账或出账对应净额；有三行手填，应保留历史'),
('Bank Verification','J12:J35','bank_balance','银行滚动余额','decimal','计算','与下一行倒序衔接，当前首页取J14'),
('Bank Verification','K12:K35','bank_memo','银行备注','text','员工录入','含其他船及失败退款，不是正式业务外键'),
('分析','A4:A66','estimate_vessel','船名','reference','员工选择','目前业务金额未填的估算模板'),
('分析','B4:B66','estimate_description','类型','text','员工录入','具体事项或费用说明'),
('分析','C4:C66','estimate_requisition','RQA','text','员工录入','申请号，字段含义须与各页场景区分'),
('分析','D4:D66','estimate_supplier','供应商','reference','员工选择','往来方'),
('分析','E4:E66','estimate_po','PO Nos','text','员工录入','订单编号'),
('分析','F4:F66','estimate_original_amount','原币金额','decimal','员工录入','当前空，不能视为已确认0'),
('分析','G4:G66','estimate_rate','汇率除数','decimal','员工录入','当前均1，本页USD=F/G'),
('分析','H4:H66','estimate_usd','估算USD','decimal','计算','原币额÷汇率除数'),
('分析','I4:I66','estimate_catalogue','变化事项分类','enum','员工选择','Shipowner/Flag/DOC等预设'),
('分析','J4:J66','estimate_agreement','协议归属','enum','员工选择','Take-over/OPEX预设'),
('分析','K4:K66','estimate_place','地区因子','decimal','员工录入','当前0，未接入完整金额计算链，含义待确认'),
('分析','L4:L66','estimate_overtime','加班因素','decimal','员工录入','当前0，未接入完整金额计算链'),
('分析','M4:M66','estimate_low','低值估算','decimal','计算/覆盖','有H、H*0、0、空多种策略，原公式全量保留'),
('分析','N4:N66','estimate_mid','合理值估算','decimal','员工录入/待定义','当前多数为空，无统一中值算法'),
('分析','O4:O66','estimate_high','高值估算','decimal','计算','多数取H'),
('分析','P3:P33','estimate_options','辅助选项字典','text','配置','独立列表；不自动与同一行金额关联'),
('分析','R2:T20','aux_settlement','辅助结算及材料提示','mixed','员工录入/计算','WAHSIN与SCORPIO WQ自由辅助区，原单元格完整留存'),
('Account Code-2版','C4:C165','ship_account_code','船管科目编码','text','配置','160条有效编码，非连续行'),
('Account Code-2版','D4:D165','ship_account_description','船管科目名称','text','配置','含章节及明细'),
('Account Code-2版','E4:E165','responsible_department','PIC责任部门','text','配置','Crew/Technical等，部分空或章节标签'),
('Account Code-2版','G4:G35','crew_account_code','船员细项编码','text','配置','32条，独立命名空间'),
('Account Code-2版','H4:I35','crew_account_description','船员细项中英文名称','text','配置','逐码保留'),
('伙食海关库房管理','I14 I30','inventory_month','月份','date','员工选择','8月与7月两个独立模板，O/U日期由公式复制'),
('伙食海关库房管理','C16:C27 C32:C40','cash_description','现金摘要','text','员工录入','期初、过程及月底结账'),
('伙食海关库房管理','D16:D28 D32:D41','cash_change','现金变动及结余','decimal','录入/计算','正负金额，期初结转、期末求和'),
('伙食海关库房管理','E16:E28 E32:E41','bonded_stock_change','招待品库存变动/余额','decimal','录入/计算','现金外独立资产类型'),
('伙食海关库房管理','F16:F28 F32:F41','food_stock_change','伙食库存变动/余额','decimal','录入/计算','现金外独立资产类型'),
('伙食海关库房管理','G16:H28 G32:H41','mixed_balance_change','混合余额与余额变动','decimal','计算/录入','含现金与库存汇总；部分过程行无公式'),
('伙食海关库房管理','M16:O28 M32:O41','food_monthly_line','伙食收支、采购、期初期末库存','mixed','员工录入/计算','M项目、N人民币、O美元；来源未配置完整转换汇率'),
('伙食海关库房管理','S16:U28 S32:U41','bonded_monthly_line','招待品收支与盘存','mixed','员工录入/计算','S项目、T人民币、U美元；期末库存符号需确认')]
for sh,rg,key,label,typ,entry,meaning in special_fields:
    fields.append(dict(sheet=sh,column=rg,header_cell='',source_header=label,field=key,label=label,type=typ,entry=entry,meaning=meaning))
csvout('field_dictionary.csv',fields)
records=[]
for sh,mp in maps.items():
    desc='C' if sh=='Shipmanagement RCVD' else 'B'
    rows=sorted({c['row'] for c in D['cells'] if c['sheet']==sh and c['row']>=3 and c['column']==column_index_from_string(desc) and c['value'] is not None and (c['row']<=25 if sh=='Shipmanagement RCVD' else True)})
    for r in rows:
        rec=dict(record_id=f'{SN.index(sh)+1:02}-{r:03}',sheet=sh,row=r,source_ref=f"'{sh}'!{desc}{r}")
        for col,key in mp.items():rec[key]=value(sh,col+str(r))
        records.append(rec)
allkeys=list(dict.fromkeys(k for rec in records for k in rec))
csvout('business_records.csv',records,allkeys)
bank=[]
for r in range(12,42):
    if value('Bank Verification',f'B{r}') is None:continue
    bank.append(dict(source_row=r,sequence=value('Bank Verification',f'B{r}'),date=value('Bank Verification',f'C{r}'),currency=value('Bank Verification',f'D{r}'),account=str(value('Bank Verification',f'E{r}')),direction=value('Bank Verification',f'F{r}'),gross_amount=value('Bank Verification',f'G{r}'),fee=value('Bank Verification',f'H{r}'),net_movement_amount=value('Bank Verification',f'I{r}'),running_balance=value('Bank Verification',f'J{r}'),memo=value('Bank Verification',f'K{r}')))
csvout('bank_transactions.csv',bank)
codes=[]
for r in range(4,166):
    for namespace,col,desc,cn,pic in [('ship_management','C','D',None,'E'),('crew_detail','G','H','I',None)]:
        code=value('Account Code-2版',f'{col}{r}')
        if code is not None:codes.append(dict(namespace=namespace,code=str(code),description=value('Account Code-2版',f'{desc}{r}'),chinese_description=value('Account Code-2版',f'{cn}{r}') if cn else None,pic=value('Account Code-2版',f'{pic}{r}') if pic else None,source_cell=f'{col}{r}'))
csvout('account_codes.csv',codes)
code_keys={x['code'] for x in codes};invalid_codes=[dict(sheet=r['sheet'],row=r['row'],code=r.get('account_code'),description=r.get('description')) for r in records if r.get('account_code') is not None and str(r['account_code']) not in code_keys]
csvout('unmatched_account_codes.csv',invalid_codes)
status_set={'Accrual','Receiving','Received','Approved','Paying','Completed'}
missing=[r for r in records if r['sheet'] not in ['Shipmanagement RCVD','CTM Expenses List'] and r.get('payment_status') not in status_set and r.get('invoice_usd') not in [None,0]]
csvout('expenses_missing_status.csv',missing,allkeys)
overrides=[]
for r in records:
    if r['sheet']=='Shipmanagement RCVD':continue
    for a,b in [('purchase_order_usd','goods_received_usd'),('goods_received_usd','invoice_usd')]:
        x,y=r.get(a),r.get(b)
        if type(x) in (int,float) and type(y) in (int,float) and abs(x-y)>.005:overrides.append(dict(sheet=r['sheet'],row=r['row'],description=r.get('description'),from_field=a,to_field=b,from_value=x,to_value=y,difference=y-x))
csvout('amount_differences.csv',overrides)
# Candidate matches preserve ambiguity; duplicate views must never be summed together.
master=[r for r in records if r['sheet']=='Expenses Lists'];categories=[r for r in records if r['sheet'] in ['Shipmanagement Cost','Owner Cost','Take-Over Cost','BMA Flag Change','DD Cost']]
matches=[]
for m in master:
    for r in categories:
        samepo=bool(m.get('purchase_order_no')) and m.get('purchase_order_no')==r.get('purchase_order_no')
        sameamount=m.get('invoice_usd')==r.get('invoice_usd')
        samedesc=m.get('description')==r.get('description')
        if samepo or samedesc:
            matches.append(dict(master_id=m['record_id'],master_row=m['row'],category_id=r['record_id'],category_sheet=r['sheet'],category_row=r['row'],match_basis='PO相同' if samepo else '摘要相同',master_description=m.get('description'),category_description=r.get('description'),master_amount=m.get('invoice_usd'),category_amount=r.get('invoice_usd'),amount_matches=sameamount,master_status=m.get('payment_status'),category_status=r.get('payment_status'),status_matches=m.get('payment_status')==r.get('payment_status'),review='候选关系，未作为已确认唯一交易ID'))
csvout('duplicate_view_candidates.csv',matches)
reviewed=[
dict(relation='总清单→分类',sources="Expenses Lists!M9",targets="Owner Cost!M6",amount=1660,evidence='日期、供应商、金额相同，摘要Rightship补充词不同',status='候选，待凭证确认'),
dict(relation='总清单→分类',sources="Expenses Lists!M17",targets="Shipmanagement Cost!M12 + Take-Over Cost!M4",amount=3000,evidence='季度自修奖金3000=船管1000+接船2000，同一3000收据文件名',status='拆分关系有表内证据，待凭证确认'),
dict(relation='总清单→分类',sources="Expenses Lists!M19",targets="Take-Over Cost!M5",amount=522.51,evidence='同日同金额相似摘要；总清单Completed，分类状态空，不能只合并金额',status='候选且状态冲突'),
dict(relation='总清单→分类',sources="Expenses Lists!M32",targets="Shipmanagement Cost!M20",amount=70197.08,evidence='八月工资、Top Marine、金额一致；入账日期9/4与9/12不同',status='候选且日期不同'),
dict(relation='银行入账→收款分配',sources="Bank Verification!I14",targets="Shipmanagement RCVD!I13",amount=9598.45,evidence='2026-10-05顾问款与银行净入账一致',status='金额日期可勾稽，未读外部回单'),
dict(relation='银行入账→收款分配',sources="Bank Verification!I24",targets="Shipmanagement RCVD!K18+J19+L20+I21",amount=202226.07,evidence='24996.94+12228.09+15021.04+149980=202226.07；银行毛额202246.07减费20',status='金额日期可勾稽，未读外部回单'),
dict(relation='银行入账→收款分配',sources="Bank Verification!I33",targets="Shipmanagement RCVD!L22+I23",amount=156330,evidence='1350+154980=156330；银行毛额156350减费20',status='金额可勾稽，明细日期分别7/31、8/14，需确认批次'),
dict(relation='银行入账→收款分配',sources="Bank Verification!I34",targets="Shipmanagement RCVD!I24",amount=2100,evidence='2026-07-24预付款一致',status='金额日期可勾稽，未读外部回单'),
dict(relation='银行入账→收款分配',sources="Bank Verification!I35",targets="Shipmanagement RCVD!I25",amount=1300,evidence='2026-07-22维修收款一致',status='金额日期可勾稽，未读外部回单'),
dict(relation='银行支付→费用批次',sources="Bank Verification!G23",targets="Expenses Lists!M30+M31+M32",amount=85263.12,evidence='2565+12501.04+70197.08=85263.12；Owner Cost!U10文字记录合并支付工资/换班/旗证',status='批次候选有表内证据，待回单确认'),
dict(relation='银行支付→费用批次',sources="Bank Verification!G32",targets="Take-Over Cost!M17+M18",amount=2230,evidence='150+2080=2230；接船U17文字含2230付款凭证名',status='批次候选有表内证据，待回单确认'),
dict(relation='银行→退款',sources="Bank Verification!I15",targets="Expenses Lists!M10+T10（符号相反）",amount=9520,evidence='9500本金加20手续费退回；费用端-9500及-20；同日退款说明',status='退款候选，需实际银行回单确认'),
dict(relation='CTM补给→银行',sources="Bank Verification!G25",targets="CTM Expenses List!L18 / Expenses Lists!M87",amount=50000,evidence='金额与补给摘要吻合；银行9/8、CTM入账8/4且验收文本8/12，日期不一致',status='只属候选，需解释预支/交付日期'),
dict(relation='CTM支出→费用分摊',sources="CTM Expenses List!L7（支出-3000）",targets="Expenses Lists!M17（3000）及船管1000+接船2000",amount=3000,evidence='相同日期、奖金摘要及同名3000收据；现金减少、费用按中心分摊',status='表内关系候选，系统应只记一次费用')]
csvout('relationship_evidence.csv',reviewed)
bank_candidates=[]
for b in bank:
    amt=b['gross_amount']
    cand=[]
    if amt:
        for r in master:
            x=r.get('invoice_usd')
            if isinstance(x,(int,float)) and abs(x-(amt if b['direction']=='出账' else -amt))<.005:
                cand.append(f"Expenses Lists!M{r['row']} / {r['description']}")
    bank_candidates.append(dict(bank_row=b['source_row'],date=b['date'],direction=b['direction'],gross_amount=amt,net_movement_amount=b['net_movement_amount'],single_amount_candidates=cand,reviewed_relations=[x for x in reviewed if f"!I{b['source_row']}" in x['sources'] or f"!G{b['source_row']}" in x['sources']],status='仅候选，空列表表示未建立，不能视作已完成核销'))
csvout('bank_match_candidates.csv',bank_candidates)
sheetlinks=collections.Counter((e['source_sheet'],e['target_sheet']) for e in edges if e['source_sheet']!=e['target_sheet'])
csvout('sheet_dependencies.csv',[dict(source_sheet=a,target_sheet=b,cell_edges=n) for (a,b),n in sheetlinks.items()])
# Ultimate formula inputs, ignoring the unselected whole-column INDEX possibilities.
def leaves(k,seen=None):
    seen=set() if seen is None else seen
    if k in seen:return set()
    seen=seen|{k}
    if k not in C or not C[k]['formula']:return {k}
    out=set()
    for t in effective[k]:out|=leaves(t,seen)
    return out
outputs=[];lineage=[]
report_labels={
('SOFP','C6'):('statement_title','财务报表标题'),('SOFP','E11'):('legacy_director_due','原表董事往来资产额（累计资金）'),('SOFP','E13'):('legacy_current_assets','原表流动资产小计'),('SOFP','E15'):('legacy_accrued_expenses','原表应计费用总额'),('SOFP','E16'):('legacy_cost_total','费用/待付款/拨备用金旧表合计'),('SOFP','E18'):('legacy_net_funding','累计资金减旧表费用净额'),('SOFP','E25'):('legacy_implied_capital','按旧表倒算股本额'),('SOFP','E27'):('legacy_retained_earnings','按旧表倒算留存收益/亏损'),('SOFP','E28'):('legacy_equity_total','旧表权益合计'),('SOFP','D33'):('funding_total','五类已分配实收资金'),('SOFP','D34'):('bank_balance','银行余额'),('SOFP','D35'):('ctm_balance','船长备用金余额'),('SOFP','D36'):('shipmanagement_completed_with_fees','船管Completed加手续费'),('SOFP','D37'):('owner_completed_with_fees','船东费用Completed加手续费'),('SOFP','D38'):('takeover_completed_with_fees','接船Completed加手续费'),('SOFP','D39'):('bma_completed_with_fees','换旗Completed加手续费'),('SOFP','D40'):('dd_completed_with_fees_legacy','原表坞修Completed含费口径'),('SOFP','D41'):('funding_reconciliation_difference','总资金平衡差额'),('SOFP','D42'):('funding_reconciliation_status','总资金平衡结论'),('SOFP','J44'):('four_center_cost_check','四类费用合计辅助核对'),('SOFP','J45'):('legacy_cost_check','费用合计辅助核对'),('SOFP','E47'):('equity_less_ctm_auxiliary','倒算权益减CTM辅助差额'),
('Bank Verification','J7'):('pending_costs','五个未完成状态费用合计'),('Bank Verification','J8'):('legacy_profit','按旧表利润列求和'),('Bank Verification','J9'):('ctm_balance','船长备用金资产'),('Bank Verification','J10'):('cash_coverage_difference','银行+CTM−待付现金覆盖差额'),('Bank Verification','J11'):('bank_balance','银行倒序余额链首个非空余额'),('Bank Verification','H11'):('bank_fee_total','银行手续费合计'),('Bank Verification','M9'):('fleet_balance_total','船队各船分配余额合计'),('Bank Verification','M11'):('fleet_balance_difference','分船合计减外部银行余额占位值'),
('Shipmanagement RCVD','D27'):('shipmanagement_funding_total','船管资金累计'),('Shipmanagement RCVD','D28'):('takeover_funding_total','接船资金累计'),('Shipmanagement RCVD','D29'):('owner_funding_total','船东费用资金累计'),('Shipmanagement RCVD','D30'):('legacy_dd_label_bma_value','原表DD标签但取换旗资金'),('Shipmanagement RCVD','D31'):('funding_total','四行资金合计（不含坞修M2）'),('Shipmanagement RCVD','B30'):('management_days','管理经过天数'),('Shipmanagement RCVD','D32'):('funding_per_management_day','累计资金除管理经过天数（旧表OPEX标签）')}
for sh in ['SOFP']:
    for center,col in [('shipmanagement','N'),('owner','X'),('takeover','AH'),('drydock','AR'),('bma','AZ')]:
        for row,label in [(11,'原表应收栏'),(14,'原表预付款栏'),(15,'原表其他应收'),(17,'原表资产小计'),(21,'原表应付栏'),(24,'应计栏'),(26,'费用/负债合计'),(28,'资金减费用净额'),(34,'期初结余'),(36,'原表经营成本栏'),(37,'船东代付栏'),(38,'当期资金栏'),(40,'原表资金往来余额'),(41,'资金净额辅助核对')]:
            if (sh,f'{col}{row}') in C:report_labels[(sh,f'{col}{row}')]=(center+'.legacy_row_'+str(row),center+' '+label)
for cell in ['J6','T6','AD6','AN6','AV6','E8','E32']:report_labels['SOFP',cell]=('as_of_date.'+cell,'原表日期驱动/引用（AV6为错引空白）')
for cell in ['I2','S2','AC2','AM2','AU2']:report_labels['SOFP',cell]=('company_title.'+cell,'报表主体名称')
for sh in ['Cost Checking']:
    for row,center in [(6,'船管'),(7,'船东'),(8,'接船'),(9,'换旗'),(10,'总清单'),(11,'总清单减四类费用差额')]:
        for col,label in zip('CDEFGHIJKL',['总费用','Accrual','Receiving','Received','Approved','Paying','Completed','手续费','贷项应计','贷项利润']):
            report_labels[sh,col+str(row)]=('cost_check.'+col+str(row),center+' '+label)
    for cell,label in [('C5','全部实收资金辅助合计'),('I5','四类实收资金合计'),('J5','实收手续费'),('B15','实收资金减总费用'),('C15','船管实收'),('D15','船管总费用'),('E15','船管资金净额'),('F15','船东费用实收'),('G15','船东总费用'),('H15','船东资金净额'),('I15','接船实收'),('J15','接船总费用'),('K15','接船资金净额'),('L15','总清单利润字段合计'),('I18','换旗实收'),('J18','换旗总费用'),('K18','换旗资金净额')]:report_labels[sh,cell]=('cost_check.'+cell,label)
def context(c):
    sh,r,col=c['sheet'],c['row'],c['column']
    if sh in maps and r>=3:
        return str(value(sh,('C' if sh=='Shipmanagement RCVD' else 'B')+str(r)) or '')
    labs=[x for x in D['cells'] if x['sheet']==sh and x['row']==r and x['column']<col and x['kind']=='literal' and isinstance(x['value'],str)]
    return labs[-1]['value'] if labs else ''
for c in D['cells']:
    col=get_column_letter(c['column']);sh=c['sheet'];c['field']=maps.get(sh,{}).get(col,'');c['row_context']=context(c)
    c['semantic']=FIELDS.get(c['field'],{}).get('meaning','报表标签、报表结果、字典或辅助区域；按原坐标保留')
    if sh in maps and c['row']==2:
        c['field']='legacy_summary.'+c['cell']
        c['semantic']='汇总/表头辅助行，不能套用同列业务明细含义；以本单元格公式和来源为准'
    if sh=='Shipmanagement RCVD' and c['row']>=27:
        c['field']='receipt_overview.'+c['cell'];c['semantic']='管理天数、分类实收及日均辅助区，具体口径见规则R28/R30'
    if sh in ['Owner Cost','Take-Over Cost','BMA Flag Change'] and c['row']>2 and not value(sh,'B'+str(c['row'])) and col in ['AC','AD','AE','AF','AG']:
        c['field']='legacy_auxiliary.'+c['cell'];c['semantic']='明细以外的手工辅助计算，按原公式逐项保留'
    for ssh,rg,skey,label,typ,entry,meaning in special_fields:
        if sh!=ssh:continue
        for chunk in rg.split():
            aa,bb,cc,dd=range_boundaries(chunk)
            if aa<=c['column']<=cc and bb<=c['row']<=dd:
                c['field']=skey;c['semantic']=meaning
                if sh in ['分析','伙食海关库房管理']:c['row_context']=label+' / '+c['row_context']
    if (sh,c['cell']) in report_labels:
        c['field'],c['row_context']=report_labels[sh,c['cell']]
        c['semantic']='原表报表指标；名称描述其实际公式用途，业务限制详见规则及异常'
    k=(sh,c['cell'])
    if c['formula'] and (sh in ['SOFP','Cost Checking'] or (sh=='Bank Verification' and c['row']<=11) or (sh=='Shipmanagement RCVD' and (c['row']==2 or c['row']>=27)) or (sh in maps and c['row']==2) or sh in ['分析','伙食海关库房管理']):
        lab=c['row_context']
        if sh in maps and c['row']==2:
            finalcol={'Expenses Lists':'AD','Shipmanagement Cost':'AC','Owner Cost':'AC','Take-Over Cost':'AC','BMA Flag Change':'AD','DD Cost':'AB'}.get(sh)
            lab='旧表六状态费用合计+手续费' if col==finalcol else (FIELDS.get(maps[sh].get(col,''),{}).get('label','辅助')+'汇总/辅助')
        out=dict(output_id=f'OUT-{len(outputs)+1:04}',sheet=sh,cell=c['cell'],label=lab or FIELDS.get(c['field'],{}).get('label','辅助计算'),value=c['value'],formula=c['formula'],direct_refs=[x['reference'] for x in refs if x['formula_sheet']==sh and x['formula_cell']==c['cell']],field=c['field'],leaf_input_count=len(leaves(k)))
        outputs.append(out)
        for t in sorted(leaves(k)):
            tc=C.get(t,{})
            lineage.append(dict(output_sheet=sh,output_cell=c['cell'],input_sheet=t[0],input_cell=t[1],input_exists=t in C,input_value=tc.get('value'),input_field=maps.get(t[0],{}).get(re.sub(r'\d','',t[1]),'')))
csvout('report_output_mapping.csv',outputs);csvout('output_input_lineage.csv',lineage)
csvout('all_cells.csv',D['cells']);csvout('all_formulas.csv',[c for c in D['cells'] if c['formula']])
summary=dict(record_counts=dict(collections.Counter(r['sheet'] for r in records)),bank_records=len(bank),account_codes=len(codes),invalid_codes=invalid_codes,missing_status_counts=dict(collections.Counter(r['sheet'] for r in missing)),amount_differences=len(overrides),duplicate_view_candidates=len(matches),formula_check_counts=dict(counts),formula_groups=len(gs),formula_references=len(refs),expanded_dependency_edges=len(edges),report_outputs=len(outputs),lineage_rows=len(lineage),bank_credit_gross=sum(r['gross_amount'] or 0 for r in bank if r['direction']=='入账'),bank_debit_gross=sum(r['gross_amount'] or 0 for r in bank if r['direction']=='出账'),bank_fee_total=sum(r['fee'] or 0 for r in bank),ctm_in=sum(r.get('invoice_usd') or 0 for r in records if r['sheet']=='CTM Expenses List' and r.get('cash_direction')=='In'),ctm_out=-sum(r.get('invoice_usd') or 0 for r in records if r['sheet']=='CTM Expenses List' and r.get('cash_direction')=='out'))
bundle=dict(workbook=D,fields=fields,records=records,bank=bank,codes=codes,outputs=outputs,summary=summary,formula_groups=gs,checks=checks,dependencies=refs,missing_status=missing,amount_differences=overrides,duplicate_candidates=matches,relationship_evidence=reviewed,bank_candidates=bank_candidates,sheet_links=[dict(source=a,target=b,count=n) for (a,b),n in sheetlinks.items()])
(ROOT/'data/analysis_bundle.json').write_text(json.dumps(bundle,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
