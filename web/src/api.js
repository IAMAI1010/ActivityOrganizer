import { cloud } from './cloud'

const ACTIVITY_COLUMNS =
    'id,owner_id,title,description,location,latitude,longitude,start_at,end_at,cover_url,cover_spec,form_fields,status,owner_name,created_at'
const SIGNUP_COLUMNS = 'id,activity_id,nickname,name,phone,answers,created_at'

function toError(error, fallback) {
    if (!error) return null
    return {
        code: error.code || 'REQUEST_FAILED',
        message: error.message || fallback,
    }
}

function rowsOf(result) {
    return Array.isArray(result && result.data) ? result.data : []
}

// 活动列表：RLS 决定可见范围（自己创建的全部 + 他人已发布的）。
export async function listActivities() {
    const result = await cloud.database
        .from('activities')
        .select(ACTIVITY_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(100)
    return {
        data: rowsOf(result),
        error: toError(result && result.error, '活动列表加载失败，请稍后重试'),
    }
}

export async function createActivity(payload) {
    const result = await cloud.database.from('activities').insert(payload).select(ACTIVITY_COLUMNS)
    const rows = rowsOf(result)
    return {
        data: rows[0] || null,
        error: toError(result && result.error, '活动创建失败，请稍后重试'),
    }
}

export async function updateActivity(id, payload) {
    const result = await cloud.database
        .from('activities')
        .update(payload)
        .eq('id', id)
        .select(ACTIVITY_COLUMNS)
    const rows = rowsOf(result)
    if (!rows.length && !(result && result.error)) {
        return { data: null, error: { code: 'NOT_CHANGED', message: '没有保存成功：这条活动不属于当前账号，或已被删除。' } }
    }
    return {
        data: rows[0] || null,
        error: toError(result && result.error, '活动保存失败，请稍后重试'),
    }
}

export async function deleteActivity(id) {
    const result = await cloud.database.from('activities').delete().eq('id', id).select('id')
    const rows = rowsOf(result)
    if (!rows.length && !(result && result.error)) {
        return { ok: false, error: { code: 'NOT_CHANGED', message: '没有删除成功：这条活动不属于当前账号，或已被删除。' } }
    }
    return {
        ok: rows.length > 0,
        error: toError(result && result.error, '删除失败，请稍后重试'),
    }
}

// 报名记录：RLS 只放行自己名下活动的报名，含姓名与手机号。
export async function listSignups() {
    const result = await cloud.database
        .from('signups')
        .select(SIGNUP_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(1000)
    return {
        data: rowsOf(result),
        error: toError(result && result.error, '报名名单加载失败，请稍后重试'),
    }
}
