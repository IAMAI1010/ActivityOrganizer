const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(value) {
    return value < 10 ? `0${value}` : `${value}`;
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateText(value) {
    const date = parseDate(value);
    if (!date) return '';
    return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
}

function formatClock(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTimeRange(startAt, endAt) {
    const start = parseDate(startAt);
    const end = parseDate(endAt);
    if (!start) return '';
    const startText = `${formatDateText(startAt)} ${formatClock(start)}`;
    if (!end) return startText;
    const sameDay = start.toDateString() === end.toDateString();
    return sameDay
        ? `${startText} - ${formatClock(end)}`
        : `${startText} - ${formatDateText(endAt)} ${formatClock(end)}`;
}

function toDisplayActivity(row) {
    if (!row) return null;
    const fields = Array.isArray(row.form_fields) ? row.form_fields : [];
    return {
        id: row.id,
        title: row.title || '未命名活动',
        description: row.description || '',
        location: row.location || '',
        cover_url: row.cover_url || '',
        owner_name: row.owner_name || '',
        start_at: row.start_at,
        end_at: row.end_at,
        dateText: formatDateText(row.start_at),
        timeText: formatTimeRange(row.start_at, row.end_at),
        formFields: fields.map((field, index) => ({
            key: field.key || `field_${index}`,
            label: field.label || `补充信息 ${index + 1}`,
            type: field.type === 'textarea' || field.type === 'select' ? field.type : 'text',
            required: field.required === true,
            options: Array.isArray(field.options) ? field.options : [],
            value: '',
            pickerIndex: 0,
            pickerText: Array.isArray(field.options) && field.options.length > 0 ? field.options[0] : '',
        })),
    };
}

module.exports = {
    formatDateText,
    formatTimeRange,
    toDisplayActivity,
};
