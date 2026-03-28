export const CHAIR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const VIP_TABLES = new Set([2, 4, 8, 10, 14, 16, 1, 3, 7, 9, 13, 15])
export const UNAVAILABLE_TABLES = new Set([])

export const LAYOUT = {
  sideLeft:  [],
  sideRight: [],
  leftBlock: [
    [51, 50, 49, 48, 47, 46, null],
    [56, 55, 54, 53, 52, null, null, null, null],
    [63, 62, 61, 60, 59, 58, 57, null, null],
    [72, 71, 70, 69, 68, 67, 66, 65, 64],
    // [80, 79, 78, 77, 76, 75, 74, 73],
  ],
  rightBlock: [
    [null, 1, 2, 3, 4, 5, 6],
    [null, null, null, null, 7, 8, 9, 10, 11],
    [null, null, 12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25, 26, 27],
  ],
  bottomLeft: [
    [80, 79, 78, 77, 76, 75, 74, 73],
    [86, 85, 84, 83, 82, 81],
  ],
  bottomRight: [
    [28, 29, 30, 31, 32, 33, 34, 35],
    [36, 37, 38, 39, 40, 41],
    [0,0 ,42, 43, 44, 45],
  ],
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
    ...LAYOUT.bottomLeft.flat(),
    ...LAYOUT.bottomRight.flat(),
  ].filter(n => n !== null && n !== 0)
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
