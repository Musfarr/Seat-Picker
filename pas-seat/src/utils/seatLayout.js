export const CHAIR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

// Front 2 rows nearest to the stage on both sides are VIP (Tables 1-8 and 29-36)
export const VIP_TABLES = new Set([])
export const UNAVAILABLE_TABLES = new Set([1, 2]) // Zero reserved tables

export const LAYOUT = {
  leftBlock: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
    [21, 22, 23, 24],
    [25, 26, 27, 28],
  ],
  rightBlock: [
    [29, 30, 31, 32],
    [33, 34, 35, 36],
    [37, 38, 39, 40],
    [41, 42, 43, 44],
    [45, 46, 47, 48],
    [49, 50, 51, 52],
    [53, 54, 55, 56],
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
    ...LAYOUT.leftBlock.flat(),
    ...LAYOUT.rightBlock.flat(),
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
