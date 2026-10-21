// Decimal strings and BigInt keep workbook precision out of binary-float arithmetic.
function parts(value) {
  let text=String(value??'0').trim()
  if (/e/i.test(text)) {
    const [body,exponent]=text.toLowerCase().split('e'); const e=Number(exponent)
    if (!Number.isInteger(e)||Math.abs(e)>100) throw Error('金额超出可用范围')
    const negative=body.startsWith('-'); const digits=body.replace(/^[+-]/,'').split('.')
    const all=digits.join(''); const point=digits[0].length+e
    text=(negative?'-':'')+(point<=0?'0.'+'0'.repeat(-point)+all:point>=all.length?all+'0'.repeat(point-all.length):all.slice(0,point)+'.'+all.slice(point))
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)||text.length>120) throw Error('请输入有效数字')
  const [a,b='']=text.replace(/^\+/,'').split('.')
  return {n:BigInt(a+b),s:b.length}
}
function format(n,s) {
  const negative=n<0n; let text=(negative?-n:n).toString().padStart(s+1,'0')
  if(s) text=text.slice(0,-s)+'.'+text.slice(-s)
  return (negative?'-':'')+text.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'')
}
function aligned(a,b) { a=parts(a);b=parts(b);const s=Math.max(a.s,b.s);return [a.n*10n**BigInt(s-a.s),b.n*10n**BigInt(s-b.s),s] }
export function decimal(v) { const {n,s}=parts(v); return format(n,s) }
export function add(a,b) {const[x,y,s]=aligned(a,b);return format(x+y,s)}
export function sub(a,b) {const[x,y,s]=aligned(a,b);return format(x-y,s)}
export function mul(a,b) {a=parts(a);b=parts(b);return format(a.n*b.n,a.s+b.s)}
export function div(a,b,precision=12) {
  a=parts(a);b=parts(b);if(!b.n)throw Error('汇率不能为零')
  const x=a.n*10n**BigInt(b.s+precision),y=b.n*10n**BigInt(a.s)
  let n=x/y;const rem=x%y
  if((rem<0n?-rem:rem)*2n>=(y<0n?-y:y))n+=(x<0n)!==(y<0n)?-1n:1n
  return format(n,precision)
}
export function compare(a,b) {const[x,y]=aligned(a,b);return x===y?0:x>y?1:-1}
export const sum=values=>values.reduce((a,b)=>add(a,b??'0'),'0')
export const negate=v=>sub('0',v)
export function round(v,places=2) {return div(v,'1',places)}
export function money(v) {
  if(v===null||v===undefined||v==='')return '—'
  if(typeof v==='string'&&v.startsWith('#'))return v
  try {return Number(decimal(v)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} catch {return String(v)}
}
