from pathlib import Path
import json,csv,hashlib,zipfile,xml.etree.ElementTree as ET
from decimal import Decimal
ROOT=Path(__file__).resolve().parents[1]
b=json.loads((ROOT/'data/analysis_bundle.json').read_text())
raw=json.loads((ROOT/'data/workbook_raw.json').read_text())
model=json.loads((ROOT/'data/dependency_model.json').read_text())
cells=raw['cells'];forms=[c for c in cells if c['formula']]
checks=[]
def test(cond,label):
    assert cond,label
    checks.append(label)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=ROOT/'source'/raw['source_name']
test(sha(source)==raw['source_sha256'],'archived source bytes match extraction source hash')
z=zipfile.ZipFile(source)
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
xmls=[n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
xml_formula_count=sum(len(ET.fromstring(z.read(n)).findall('.//m:f',ns)) for n in xmls)
test(len(xmls)==14 and xml_formula_count==len(forms)==2722,'source OOXML formula count and 14 sheets match extraction')
test(len(cells)==6926==sum(s['nonempty'] for s in raw['sheets']),'all nonempty cell counts reconcile')
test(len({(c['sheet'],c['cell']) for c in cells})==len(cells),'source cell keys unique')
test(sum(g['count'] for g in model['groups'])==len(forms),'formula groups cover each formula')
members={(g['sheet'],a) for g in model['groups'] for a in g['cells']}
test(members=={(c['sheet'],c['cell']) for c in forms},'formula groups have no omissions or additions')
for name,count in [('all_cells.csv',6926),('all_formulas.csv',2722),('business_records.csv',232),('bank_transactions.csv',22),('account_codes.csv',192),('report_output_mapping.csv',541),('output_input_lineage.csv',96729),('cell_dependencies.csv',14626)]:
    with (ROOT/'data'/name).open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
    test(len(rows)==count,name+' row count')
    if name=='all_formulas.csv':
        exported={(r['sheet'],r['cell']):r['formula'].removeprefix("'") for r in rows}
        test(all(exported[c['sheet'],c['cell']]==c['formula'] for c in forms),'every CSV formula preserves exact source text after text-prefix removal')
test(sum(c['status']=='match' for c in model['checks'])==2721,'2721 independently recalculated formula values match cached values')
test([(c['sheet'],c['cell']) for c in model['checks'] if c['status']!='match']==[('Take-Over Cost','AE15')],'only source AE15 error remains')
by={(c['sheet'],c['cell']):c for c in cells}
def n(sh,a):return Decimal(str(by[sh,a]['value']))
funds=sum(n('Shipmanagement RCVD',a) for a in ['I2','J2','K2','L2','M2'])
cost=sum(n(sh,a) for sh,a in [('Shipmanagement Cost','AC2'),('Owner Cost','AC2'),('Take-Over Cost','AC2'),('BMA Flag Change','AD2'),('DD Cost','AB2')])
test(abs(funds-Decimal('371554.52'))<Decimal('.00000001'),'five funding pools independently sum to 371554.52')
test(abs(cost-n('Expenses Lists','AD2'))<Decimal('.00000001'),'five category totals reconcile to expenses list')
ctm_in=sum(Decimal(str(r['invoice_usd'])) for r in b['records'] if r['sheet']=='CTM Expenses List' and r['cash_direction']=='In')
ctm_out=sum(Decimal(str(r['invoice_usd'])) for r in b['records'] if r['sheet']=='CTM Expenses List' and r['cash_direction']=='out')
test(ctm_in+ctm_out==n('CTM Expenses List','AA2')==Decimal('29908'),'CTM signed movements independently reconcile to ROB')
paid=sum(n(sh,a)+n(sh,fee) for sh,a,fee in [('Shipmanagement Cost','AB2','T2'),('Owner Cost','AB2','T2'),('Take-Over Cost','AB2','T2'),('BMA Flag Change','AC2','T2'),('DD Cost','AA2','S2')])
diff=funds-n('Bank Verification','J11')-n('CTM Expenses List','AA2')-paid
test(abs(diff-n('SOFP','D41'))<Decimal('.00000001'),'funds balance independently recomputed from component cash and completed amounts')
test(not any(r['field']=='credit_note_attachment' and r['column']=='U' and r['sheet']=='BMA Flag Change' for r in b['fields']),'BMA supplementary attachment mapping not falsely classified')
test(len(b['fields'])>250 and len(b['outputs'])==541,'data field and report mapping present')
test(len(b['relationship_evidence'])==14 and len(b['bank_candidates'])==22,'business relationship and bank candidate coverage')
spec=json.loads((ROOT/'analysis/system_specification.json').read_text())
test(len(spec['rules'])==45 and len(spec['acceptance'])==18 and len(spec['open_questions'])==12,'business rules and migration acceptance coverage')
orig=Path('/Users/stone/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/s269119257_97a6/msg/file/2026-10')/raw['source_name']
test(sha(orig)==raw['source_sha256'],'original source still unchanged after analysis')
result=dict(passed=True,checks=checks,field_dictionary_rows=len(b['fields']),source_sha256=raw['source_sha256'],source_ooxml_formula_count=xml_formula_count,net_funding=str(funds-cost),funds_reconciliation_difference=str(diff))
(ROOT/'analysis/data_verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
files=[dict(path=str(p.relative_to(ROOT)),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name!='manifest.json']
(ROOT/'manifest.json').write_text(json.dumps(dict(source_sha256=raw['source_sha256'],files=files),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(passed=True,checks=len(checks),field_dictionary_rows=len(b['fields']),files=len(files),source_unchanged=True),ensure_ascii=False))
