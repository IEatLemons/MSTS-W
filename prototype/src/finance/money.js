// All new monetary values are integer minor units. Legacy snapshot stays untouched.
export function cents(value) {
  const text = String(value ?? '').trim()
  if (!/^-?\d+(\.\d{1,8})?$/.test(text)) throw new Error('请输入有效金额')
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = text.replace('-', '').split('.')
  let result = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  if (Number(fraction[2] || 0) >= 5) result++
  if (negative) result = -result
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('金额超出范围')
  return Number(result)
}
export function convert(amount, rate = '1') {
  if (!/^\d+(\.\d{1,8})?$/.test(String(rate)) || Number(rate) <= 0) throw new Error('汇率必须为正数，最多8位小数')
  const [whole, frac = ''] = String(rate).split('.')
  const factor = BigInt(whole + frac.padEnd(8, '0'))
  const value = BigInt(amount) * factor
  const result = Number((value < 0n ? -((-value + 50000000n) / 100000000n) : (value + 50000000n) / 100000000n))
  if (!Number.isSafeInteger(result)) throw new Error('折算金额超出范围')
  return result
}
export function format(amount = 0, currency = '') {
  return `${(Number(amount) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`
}
export const sum = (rows, key = 'amount') => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
export function proportional(amount, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return weights.map(() => 0)
  const shares = weights.map(weight => Number(BigInt(amount) * BigInt(weight) / BigInt(total)))
  const order = weights.map((weight, index) => ({ index, rest: BigInt(amount) * BigInt(weight) % BigInt(total) })).sort((a, b) => a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1)
  for (let left = amount - shares.reduce((a, b) => a + b, 0), i = 0; left > 0; left--, i++) shares[order[i].index]++
  return shares
}
