from pathlib import Path
import json,csv,re,collections,math,datetime,html,zipfile,xml.etree.ElementTree as ET
from openpyxl.formula.tokenizer import Tokenizer
from openpyxl.utils.cell import range_boundaries,get_column_letter,column_index_from_string
from openpyxl.utils.datetime import to_excel
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'data/workbook_raw.json').read_text())
C={(c['sheet'],c['cell']):c for c in D['cells']}
SN=[s['name'] for s in D['sheets']]
def csvout(name,rows,keys=None):
    if not rows:return
    keys=keys or list(rows[0])
    with (ROOT/'data'/name).open('w',encoding='utf-8-sig',newline='') as f:
        z=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');z.writeheader()
        for row in rows:
            out={k:json.dumps(row.get(k),ensure_ascii=False) if isinstance(row.get(k),(list,dict)) else row.get(k) for k in keys}
            z.writerow({k:("'"+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v) for k,v in out.items()})
def splitref(s,default):
    if '!' in s:
        sh,rr=s.rsplit('!',1);sh=sh.strip("'").replace("''", "'")
    else: sh,rr=default,s
    return sh,rr.replace('$','')
def expand(s,default):
    sh,rr=splitref(s,default)
    if not re.fullmatch(r'[A-Z]+\d*(?::[A-Z]+\d*)?',rr):raise ValueError(s)
    a,b,c,d=range_boundaries(rr)
    full=b is None or d is None
    b=b or 1;d=d or max(x['row'] for x in D['cells'] if x['sheet']==sh)
    return [(sh,f'{get_column_letter(j)}{i}') for i in range(b,d+1) for j in range(a,c+1)],full
def refstr(k):return f"'{k[0]}'!{k[1]}"
def value(sh,a):return C.get((sh,a),{}).get('value')
def num(x):
    if x is None:return 0
    if isinstance(x,(int,float)):return x
    if isinstance(x,str) and re.match(r'^\d{4}-\d\d-\d\dT',x):return to_excel(datetime.datetime.fromisoformat(x))
    raise ValueError('text used in arithmetic: '+str(x))
def flatten(xs):
    for x in xs:
        if isinstance(x,list):yield from flatten(x)
        else:yield x
class Err(Exception):pass
class Ref:
    def __init__(self,s,sh):self.s=s;self.sh=sh
    def keys(self):return expand(self.s,self.sh)[0]
    def val(self):
        keys=self.keys()
        vals=[ev(k) for k in keys]
        return vals if ':' in self.s else vals[0]
def val(x):return x.val() if isinstance(x,Ref) else x
def scalar(x):
    x=val(x)
    if isinstance(x,list):raise Err('array outside supported function')
    return x
def binary(op,a,b):
    a=val(a);b=val(b)
    if isinstance(a,list) or isinstance(b,list):
        n=len(a) if isinstance(a,list) else len(b)
        return [binary(op,a[i] if isinstance(a,list) else a,b[i] if isinstance(b,list) else b) for i in range(n)]
    if op in ['=','<>','>','<','>=','<=']:
        if a is None:a='' if isinstance(b,str) else 0
        if b is None:b='' if isinstance(a,str) else 0
        if isinstance(a,str) and isinstance(b,str):a=a.casefold();b=b.casefold()
        if op=='=':return a==b
        if op=='<>':return a!=b
        try:return {'>':lambda:a>b,'<':lambda:a<b,'>=':lambda:a>=b,'<=':lambda:a<=b}[op]()
        except TypeError:raise Err('mixed comparison')
    if op=='&':return str(a or '')+str(b or '')
    a=num(a);b=num(b)
    if op=='+':return a+b
    if op=='-':return a-b
    if op=='*':return a*b
    if op=='/':
        if b==0:raise Err('#DIV/0!')
        return a/b
    if op=='^':return a**b
    raise Err('operator '+op)
class Parser:
    PREC={'=':1,'<>':1,'>':1,'<':1,'>=':1,'<=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5}
    def __init__(self,f,sh):self.ts=[t for t in Tokenizer(f).items if t.type!='WHITE-SPACE'];self.i=0;self.sh=sh
    def expr(self,m=0):
        t=self.ts[self.i];self.i+=1
        if t.type=='OPERATOR-PREFIX':a=('unary',t.value,self.expr(6))
        elif t.type=='PAREN' and t.subtype=='OPEN':
            a=self.expr();self.i+=1
        elif t.type=='FUNC' and t.subtype=='OPEN':
            args=[]
            if self.ts[self.i].subtype!='CLOSE':
                while True:
                    args.append(self.expr())
                    if self.ts[self.i].type!='SEP':break
                    self.i+=1
            self.i+=1;a=('func',t.value[:-1].upper(),args)
        elif t.type=='OPERAND':
            if t.subtype=='RANGE':a=('ref',t.value)
            elif t.subtype=='NUMBER':a=('literal',float(t.value))
            elif t.subtype=='TEXT':a=('literal',t.value[1:-1].replace('""','"'))
            elif t.subtype=='LOGICAL':a=('literal',t.value=='TRUE')
            elif t.subtype=='ERROR':a=('error',t.value)
            else:raise Err('operand '+str(t))
        else:raise Err('token '+str(t))
        while self.i<len(self.ts):
            t=self.ts[self.i]
            if t.type!='OPERATOR-INFIX' or self.PREC.get(t.value,0)<m:break
            p=self.PREC[t.value];self.i+=1;a=('binary',t.value,a,self.expr(p+1))
        return a
    def run(self,n):
        kind=n[0]
        if kind=='literal':return n[1]
        if kind=='error':raise Err(n[1])
        if kind=='ref':return Ref(n[1],self.sh)
        if kind=='unary':return num(scalar(self.run(n[2])))*(1 if n[1]=='+' else -1)
        if kind=='binary':return binary(n[1],self.run(n[2]),self.run(n[3]))
        name,args=n[1:]
        if name=='IF':
            cond=val(self.run(args[0]))
            if isinstance(cond,list):
                a=val(self.run(args[1]));b=val(self.run(args[2])) if len(args)>2 else False
                return [(a[i] if isinstance(a,list) else a) if c else (b[i] if isinstance(b,list) else b) for i,c in enumerate(cond)]
            return self.run(args[1] if cond else args[2]) if len(args)>2 or cond else False
        if name=='ROW':return [int(re.search(r'\d+',a).group()) for sh,a in self.run(args[0]).keys()]
        if name=='INDEX':
            ref=self.run(args[0]);idx=int(num(scalar(self.run(args[1]))))
            sh,rr=splitref(ref.s,ref.sh)
            if re.fullmatch(r'[A-Z]+:[A-Z]+',rr):return ev((sh,rr.split(':')[0]+str(idx)))
            return ev(ref.keys()[idx-1])
        xs=[val(self.run(a)) for a in args]
        if name=='SUM':return sum(x for x in flatten(xs) if isinstance(x,(int,float)))
        if name=='MIN':return min(x for x in flatten(xs) if type(x) in (int,float))
        if name=='OR':return any(flatten(xs))
        if name=='AND':return all(flatten(xs))
        if name=='TODAY':return to_excel(datetime.datetime(2026,10,14))
        if name=='TEXT':return __import__('openpyxl').utils.datetime.from_excel(num(xs[0])).strftime('%d-%b-%Y')
        raise Err('unsupported '+name)
memo={};active=set();asts={}
def ev(k):
    if k in memo:return memo[k]
    c=C.get(k)
    if c is None:return None
    if not c['formula']:
        if c['data_type']=='e':raise Err(c['value'])
        return c['value']
    if k in active:raise Err('circular '+refstr(k))
    active.add(k)
    try:
        p=Parser(c['formula'],k[0]);n=p.expr()
        if p.i!=len(p.ts):raise Err('unconsumed tokens')
        asts[k]=n;r=scalar(p.run(n))
        if r is None:r=0
        memo[k]=r;return r
    except (ValueError,TypeError,ZeroDivisionError,IndexError) as e:raise Err(str(e))
    finally:active.remove(k)
refs=[];edges=[];effective=collections.defaultdict(set);groups=collections.defaultdict(list);checks=[]
for c in D['cells']:
    if not c['formula']:continue
    k=(c['sheet'],c['cell']);tokens=Tokenizer(c['formula']).items
    for t in tokens:
        if t.type=='OPERAND' and t.subtype=='RANGE':
            keys,full=expand(t.value,k[0]);refs.append(dict(formula_sheet=k[0],formula_cell=k[1],reference=t.value,target_sheet=keys[0][0],expanded_cells=len(keys),whole_column=full))
            for target in keys:
                edges.append(dict(source_sheet=target[0],source_cell=target[1],target_sheet=k[0],target_cell=k[1],reference=t.value,source_exists=target in C,dependency_type='possible_index_range' if full else 'direct'))
                if not full:effective[k].add(target)
    if c['array_range'] and c['cell']=='J11' and c['sheet']=='Bank Verification':
        kk=next((('Bank Verification',f'J{r}') for r in range(12,36) if value('Bank Verification',f'J{r}') is not None),None)
        if kk:effective[k].add(kk)
    normalized=[]
    for t in tokens:
        if t.type=='OPERAND' and t.subtype=='RANGE':
            sh,rr=splitref(t.value,k[0])
            def norm(m):
                ac,cl,ar,r=m.groups();col=column_index_from_string(cl);row=int(r)
                return ('C'+str(col) if ac else 'C['+str(col-c['column'])+']')+('R'+str(row) if ar else 'R['+str(row-c['row'])+']')
            # Preserve $ anchors from original reference.
            rr=t.value.rsplit('!',1)[-1]
            normalized.append(sh+'!'+re.sub(r'(\$?)([A-Z]+)(\$?)(\d+)',norm,rr))
        else:normalized.append(t.value)
    groups[(c['sheet'],''.join(normalized))].append(c['cell'])
    try:
        r=ev(k);cv=c['value'];eq=(cv is None and r in (None,'')) or cv==r
        if isinstance(cv,(int,float)) and isinstance(r,(int,float)):eq=abs(cv-r)<max(1e-7,abs(cv)*1e-11)
        if isinstance(cv,str) and re.match(r'^\d{4}-\d\d-\d\dT',cv):eq=abs(num(cv)-num(r))<1e-7
        if cv=='00:00:00' and r==0:eq=True
        checks.append(dict(sheet=k[0],cell=k[1],cached=cv,recomputed=r,status='match' if eq else 'mismatch',error=''))
    except Err as e:checks.append(dict(sheet=k[0],cell=k[1],cached=c['value'],recomputed=None,status='error',error=str(e)))
gs=[dict(group_id=f'FG{i:04}',sheet=k[0],pattern=k[1],count=len(v),cells=v,example=C[(k[0],v[0])]['formula']) for i,(k,v) in enumerate(groups.items(),1)]
csvout('formula_references.csv',refs);csvout('cell_dependencies.csv',edges);csvout('formula_groups.csv',gs);csvout('recalculation_checks.csv',checks)
csvout('all_cells.csv',D['cells']);csvout('all_formulas.csv',[c for c in D['cells'] if c['formula']]);csvout('sheet_inventory.csv',D['sheets'])
counts=collections.Counter(x['status'] for x in checks)
print('Formula checks',counts)
print('Nonmatches',json.dumps([x for x in checks if x['status']!='match'][:35],ensure_ascii=False,indent=2))
print('References',len(refs),'Edges',len(edges),'Groups',len(gs))
(ROOT/'data/dependency_model.json').write_text(json.dumps(dict(references=refs,edges=edges,groups=gs,checks=checks),ensure_ascii=False),encoding='utf-8')
