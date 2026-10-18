function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDay(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function daysInclusive(fromIso, toIso) {
  const a = parts(fromIso)
  const b = parts(toIso)
  const span = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)
  return Math.round(span / 86400000) + 1
}

export function settlementPeriods(startIso, asOfIso) {
  const start = parts(startIso)
  const asOf = parts(asOfIso)
  const periods = []
  let y = start.y
  let m = start.m
  while (y < asOf.y || (y === asOf.y && m <= asOf.m)) {
    const endD = lastDay(y, m)
    const fromD = y === start.y && m === start.m ? start.d : 1
    const from = iso(y, m, fromD)
    const settleOn = iso(y, m, endD)
    const open = y === asOf.y && m === asOf.m && asOf.d < endD
    const partial = fromD !== 1
    periods.push({
      id: iso(y, m, 1).slice(0, 7),
      name: `${y} 年 ${m} 月`,
      from,
      settleOn,
      partial,
      open,
      state: open ? '未到月底' : '已到月底',
      days: daysInclusive(from, open ? asOfIso : settleOn),
      spanDays: daysInclusive(from, settleOn),
      note: open
        ? `快照停在 ${asOfIso}，结算日仍是 ${settleOn}`
        : partial
          ? `从 ${fromD} 日开始，月底结算一次`
          : '整月，1 日到月底',
    })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return periods
}

export function ledgerByPeriod(records, periods) {
  const buckets = periods.map((period) => ({ ...period, count: 0, invoice: 0 }))
  const byId = Object.fromEntries(buckets.map((period) => [period.id, period]))
  const undated = { count: 0, invoice: 0 }
  for (const row of records) {
    if (row.sheet !== 'Expenses Lists') continue
    const key = (row.date || '').slice(0, 7)
    const amount = Number(row.invoiceUsd) || 0
    const bucket = byId[key]
    if (!bucket) {
      undated.count += 1
      undated.invoice += amount
      continue
    }
    bucket.count += 1
    bucket.invoice += amount
  }
  return { periods: buckets, undated }
}
