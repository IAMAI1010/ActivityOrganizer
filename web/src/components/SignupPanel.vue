<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../format'

const props = defineProps({
    activity: { type: Object, default: null },
    signups: { type: Array, default: () => [] },
})
const emit = defineEmits(['refresh'])

// 列 = 活动里定义的字段（按顺序） + 报名里出现的额外字段
const columns = computed(() => {
    const defined = Array.isArray(props.activity && props.activity.form_fields)
        ? props.activity.form_fields.map((field) => ({ key: field.key, label: field.label || field.key }))
        : []
    const known = new Set(defined.map((column) => column.key))
    const extra = new Set()
    props.signups.forEach((row) => {
        const answers = row.answers && typeof row.answers === 'object' ? row.answers : {}
        Object.keys(answers).forEach((key) => {
            if (!known.has(key)) {
                extra.add(key)
            }
        })
    })
    return defined.concat(Array.from(extra).map((key) => ({ key, label: key })))
})

function answerText(row, key) {
    const answers = row.answers && typeof row.answers === 'object' ? row.answers : {}
    const value = answers[key]
    if (value === undefined || value === null) return ''
    return String(value)
}

function csvCell(value) {
    const text = value === undefined || value === null ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

function exportCsv() {
    const header = ['微信昵称', '姓名', '手机号', ...columns.value.map((column) => column.label), '报名时间']
    const lines = [header.map(csvCell).join(',')]
    props.signups.forEach((row) => {
        lines.push(
            [
                row.nickname || '',
                row.name || '',
                row.phone || '',
                ...columns.value.map((column) => answerText(row, column.key)),
                formatDateTime(row.created_at),
            ]
                .map(csvCell)
                .join(','),
        )
    })
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeTitle = (props.activity && props.activity.title ? props.activity.title : '活动').replace(/[\\/:*?"<>|]/g, '_')
    link.href = url
    link.download = `报名名单-${safeTitle}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
</script>

<template>
    <div class="panel">
        <div class="panel-head">
            <div>
                <div class="panel-title">报名名单</div>
                <div class="panel-sub">共 {{ signups.length }} 人 · 昵称、姓名和手机号仅组织者登录后可见</div>
            </div>
            <div style="display: flex; gap: 8px">
                <button class="btn btn-outline btn-sm" type="button" @click="emit('refresh')">刷新</button>
                <button class="btn btn-outline btn-sm" type="button" :disabled="!signups.length" @click="exportCsv">
                    导出 CSV
                </button>
            </div>
        </div>

        <div v-if="!signups.length" class="empty-table">还没有人报名。把活动卡分享到微信群后，好友报名会出现在这里。</div>

        <div v-else class="table-wrap">
            <table class="signups">
                <thead>
                    <tr>
                        <th>微信昵称</th>
                        <th>姓名</th>
                        <th>手机号</th>
                        <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
                        <th>报名时间</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in signups" :key="row.id">
                        <td>{{ row.nickname || '—' }}</td>
                        <td>{{ row.name || '—' }}</td>
                        <td>{{ row.phone || '—' }}</td>
                        <td v-for="column in columns" :key="column.key">{{ answerText(row, column.key) || '—' }}</td>
                        <td style="white-space: nowrap; color: var(--muted)">{{ formatDateTime(row.created_at) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
