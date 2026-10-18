// 原表第一页 SOFP 在 2026-10-14 的汇总。费用总结用已完成口径，五类对照用各类费用总计。
export const summaryLines = [
  { label: '船东总收入', amount: 371554.52, tone: 'in' },
  { label: '银行余额', amount: 92779.85, tone: 'cash' },
  { label: '船长备用金', amount: 29908, tone: 'cash' },
  { label: '船管已完成费用', amount: 193372.591998376, tone: 'out' },
  { label: '帮船东支付', amount: 19700.04, tone: 'out' },
  { label: '接船已完成费用', amount: 12428.72, tone: 'out' },
  { label: '换旗已完成费用', amount: 26155.9, tone: 'out' },
  { label: '坞修已完成费用', amount: 0, tone: 'out' },
  { label: '平衡差额', amount: -2790.58199837597, tone: 'gap' },
]

export const centers = [
  { name: '船管', expense: 308970.831018376, inflow: 317958.45, net: 8987.61898162425, color: '#17343c' },
  { name: '船东', expense: 36788.27, inflow: 16371.04, net: -20417.23, color: '#9a6b3f' },
  { name: '接船', expense: 26158.99, inflow: 12228.09, net: -13930.9, color: '#24515c' },
  { name: '换旗', expense: 26341.66, inflow: 24996.94, net: -1344.72, color: '#1d6b4f' },
  { name: '坞修', expense: 0, inflow: 0, net: 0, color: '#c4b8a8' },
]
