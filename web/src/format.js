const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function parseDate(value) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

function pad(value) {
    return value < 10 ? `0${value}` : `${value}`
}

export function formatRange(startAt, endAt) {
    const start = parseDate(startAt)
    const end = parseDate(endAt)
    if (!start) return ''
    const head = `${start.getMonth() + 1}月${start.getDate()}日 ${WEEKDAYS[start.getDay()]} ${pad(start.getHours())}:${pad(start.getMinutes())}`
    if (!end) return head
    const sameDay = start.toDateString() === end.toDateString()
    return sameDay
        ? `${head} - ${pad(end.getHours())}:${pad(end.getMinutes())}`
        : `${head} - ${end.getMonth() + 1}月${end.getDate()}日 ${pad(end.getHours())}:${pad(end.getMinutes())}`
}

export function formatDateTime(value) {
    const date = parseDate(value)
    if (!date) return ''
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// timestamptz -> <input type="datetime-local"> 需要的本地时间字符串
export function toLocalInput(value) {
    const date = parseDate(value)
    if (!date) return ''
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 本地时间字符串 -> ISO（带时区，写入 timestamptz）
export function fromLocalInput(value) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function activityStatusLabel(status) {
    if (status === 'draft') return '草稿'
    if (status === 'ended') return '已结束'
    return '已发布'
}
