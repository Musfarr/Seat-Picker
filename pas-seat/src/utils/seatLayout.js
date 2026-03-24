export const CHAIR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const VIP_TABLES = new Set([2, 4, 8, 10, 14, 16, 1, 3, 7, 9, 13, 15])
export const UNAVAILABLE_TABLES = new Set([])

export const LAYOUT = {
  sideLeft:  [[62,64],[66,68],[70,72],[74,76],[78,80]],
  sideRight: [[63,61],[65,67],[69,71],[73,75],[77,79]],
  leftBlock: [
    [6, 4, 2, null],
    [12, 10, 8, null, null],
    [18, 16, 14, null, null, null],
    [32, 30, 28, 26, 24, 22, 20],
    [46, 44, 42, 40, 38, 36, 34],
    [60, 58, 56, 54, 52, 50, 48],
  ],
  rightBlock: [
    [null, 1, 3, 5],
    [null, null, 7, 9, 11],
    [null, null, null, 13, 15, 17],
    [19, 21, 23, 25, 27, 29, 31],
    [33, 35, 37, 39, 41, 43, 45],
    [47, 49, 51, 53, 55, 57, 59],
  ],
  bottomLeft:  [82, 83, 84, 85, 86, 87, 88],
  bottomRight: [81],
}

export function makeTable(num) {
  const type = VIP_TABLES.has(num) ? 'vip' : 'normal'
  const chairs = CHAIR_LABELS.map(label => ({ label, booked: false, selected: false }))
  return { id: num, num, type, available: !UNAVAILABLE_TABLES.has(num), chairs }
}

export function buildAllTables() {
  const all = {}
  const allNums = [
    ...LAYOUT.sideLeft.flat(),
    ...LAYOUT.sideRight.flat(),
    ...LAYOUT.leftBlock.flat(),
    ...LAYOUT.rightBlock.flat(),
    ...LAYOUT.bottomLeft,
    ...LAYOUT.bottomRight,
  ].filter(n => n !== null)
  allNums.forEach(n => { all[n] = makeTable(n) })
  return all
}

export function applySeatsData(tables, seatsData) {
  const bookedMap = {}
  seatsData.forEach(({ seatNumber, seatStatus }) => {
    if (seatStatus) return
    const [tableStr, chair] = seatNumber.split('-')
    const tableNum = parseInt(tableStr, 10)
    if (!bookedMap[tableNum]) bookedMap[tableNum] = new Set()
    bookedMap[tableNum].add(chair)
  })

  const updated = {}
  Object.entries(tables).forEach(([key, table]) => {
    const chairs = table.chairs.map(c => ({ ...c, booked: bookedMap[table.num]?.has(c.label) ?? false }))
    const allBooked = chairs.every(c => c.booked)
    updated[key] = { ...table, chairs, available: allBooked ? false : table.available }
  })
  return updated
}

export function getSelectedCount(table) {
  return table.chairs.filter(c => c.selected).length
}

export const INIT = buildAllTables()
