const { cloud } = require('./cloud');

const ACTIVITY_COLUMNS = 'id,title,description,location,start_at,end_at,cover_url,cover_spec,form_fields,status,owner_name,created_at';
const SIGNUP_BRIEF_COLUMNS = 'id,activity_id,nickname,avatar_url,created_at';
const LOCAL_SIGNUPS_KEY = 'activityOrganizer.signedUp';

function normalizeError(error, fallbackMessage) {
    if (!error) return null;
    const message = typeof error.message === 'string' && error.message
        ? error.message
        : fallbackMessage;
    return { code: error.code || 'REQUEST_FAILED', message };
}

function readLocalSignups() {
    try {
        const raw = wx.getStorageSync(LOCAL_SIGNUPS_KEY);
        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        return [];
    }
}

function rememberSignup(activity) {
    if (!activity || !activity.id) return;
    const list = readLocalSignups();
    const rest = list.filter(item => String(item.id) !== String(activity.id));
    rest.unshift({
        id: activity.id,
        title: activity.title,
        start_at: activity.start_at,
        location: activity.location,
        cover_url: activity.cover_url,
        signed_at: new Date().toISOString(),
    });
    try {
        wx.setStorageSync(LOCAL_SIGNUPS_KEY, rest.slice(0, 50));
    } catch (error) {
        // 本地缓存失败不影响报名结果
    }
}

function listLocalSignups() {
    return readLocalSignups();
}

function isSignedUp(activityId) {
    return readLocalSignups().some(item => String(item.id) === String(activityId));
}

async function fetchActivity(activityId) {
    const result = await cloud.database
        .from('activities')
        .select(ACTIVITY_COLUMNS)
        .eq('id', activityId)
        .maybeSingle();
    return {
        data: result ? result.data : null,
        error: normalizeError(result ? result.error : null, '活动加载失败，请稍后重试'),
    };
}

async function listRecentActivities(limit) {
    const result = await cloud.database
        .from('activities')
        .select(ACTIVITY_COLUMNS)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit || 20);
    return {
        data: Array.isArray(result && result.data) ? result.data : [],
        error: normalizeError(result ? result.error : null, '活动列表加载失败，请稍后重试'),
    };
}

async function listSignupBriefs(activityId) {
    const result = await cloud.database
        .from('signups')
        .select(SIGNUP_BRIEF_COLUMNS)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true })
        .limit(100);
    return {
        data: Array.isArray(result && result.data) ? result.data : [],
        error: normalizeError(result ? result.error : null, '报名名单加载失败，请稍后重试'),
    };
}

async function createSignup(payload) {
    const row = {
        activity_id: payload.activityId,
        nickname: payload.nickname,
        avatar_url: payload.avatarUrl || null,
        name: payload.name || null,
        phone: payload.phone || null,
        answers: payload.answers || {},
    };
    // 不链 .select()：匿名提交只申请写入，避免回读受限列。
    const result = await cloud.database.from('signups').insert(row);
    return {
        data: result ? result.data : null,
        error: normalizeError(result ? result.error : null, '报名提交失败，请稍后重试'),
    };
}

module.exports = {
    fetchActivity,
    listRecentActivities,
    listSignupBriefs,
    createSignup,
    rememberSignup,
    listLocalSignups,
    isSignedUp,
};
