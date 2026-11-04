<script setup>
import { computed, onMounted, ref } from 'vue'
import { cloud } from './cloud'
import { listActivities, listSignups } from './api'
import { activityStatusLabel, formatRange } from './format'
import ActivityEditor from './components/ActivityEditor.vue'
import LoginView from './components/LoginView.vue'
import SignupPanel from './components/SignupPanel.vue'

const booting = ref(true)
const bootError = ref('')
const session = ref(null)
const activities = ref([])
const signups = ref([])
const selectedId = ref(null)
const mode = ref('detail')
const editingActivity = ref(null)
const toast = ref('')

let toastTimer = null

function showToast(message) {
    toast.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
        toast.value = ''
    }, 2600)
}

const userName = computed(() => {
    const user = session.value && session.value.user
    if (!user) return '未登录'
    return user.name || user.email || '组织者'
})

const userInitial = computed(() => {
    const name = userName.value
    return name ? name.slice(0, 1).toUpperCase() : '·'
})

const selected = computed(() => activities.value.find((item) => item.id === selectedId.value) || null)

const canEdit = computed(() => {
    if (!selected.value || !session.value) return false
    return selected.value.owner_id === session.value.user.id
})

const signupsOfSelected = computed(() =>
    selected.value
        ? signups.value.filter((row) => String(row.activity_id) === String(selected.value.id))
        : [],
)

const shareText = computed(() => {
    if (!selected.value) return ''
    const parts = [selected.value.title]
    const range = formatRange(selected.value.start_at, selected.value.end_at)
    if (range) parts.push(range)
    if (selected.value.location) parts.push(selected.value.location)
    return `${parts.join(' · ')}，点开活动卡报名。`
})

function countOf(activityId) {
    return signups.value.filter((row) => String(row.activity_id) === String(activityId)).length
}

function thumbStyle(activity) {
    if (activity && activity.cover_url) {
        return { backgroundImage: `url(${activity.cover_url})` }
    }
    return null
}

function pathOf(activity) {
    return `/pages/detail/detail?activityId=${activity.id}`
}

async function copyText(text, message) {
    try {
        await navigator.clipboard.writeText(text)
        showToast(message)
    } catch (error) {
        showToast('复制失败，请手动选中文本复制')
    }
}

async function loadAll() {
    const [acts, signs] = await Promise.all([listActivities(), listSignups()])
    if (acts.error) showToast(acts.error.message)
    if (signs.error) showToast(signs.error.message)
    activities.value = acts.data
    signups.value = signs.data

    if (selectedId.value && !activities.value.some((item) => item.id === selectedId.value)) {
        selectedId.value = null
    }
    if (!selectedId.value && activities.value.length) {
        selectedId.value = activities.value[0].id
    }
}

async function enterApp(nextSession) {
    session.value = nextSession
    booting.value = false
    await loadAll()
}

async function restoreSession() {
    const { data } = await cloud.auth.getSession()
    if (data) {
        await enterApp(data)
        return
    }
    bootError.value = ''
    booting.value = false
}

// 授权回调必须在任何登录守卫之前处理，且 code 只能兑换一次。
async function bootstrap() {
    const url = new URL(location.href)
    const hasCallback = url.searchParams.has('code') || url.searchParams.has('error')
    if (!hasCallback) {
        await restoreSession()
        return
    }

    const provider = url.searchParams.get('provider')
    if (provider !== 'workbuddy' && provider !== 'wechat') {
        bootError.value = '授权回调缺少有效的登录方式，请重新登录。'
        booting.value = false
        return
    }

    const handler =
        provider === 'workbuddy' ? cloud.auth.handleWorkBuddyCallback : cloud.auth.handleWechatWebCallback
    if (typeof handler !== 'function') {
        bootError.value = '当前 SDK 版本不支持这种登录方式，请换用邮箱验证码。'
        booting.value = false
        return
    }

    const { data, error } = await handler.call(cloud.auth)
    if (error) {
        bootError.value = error.message || '授权登录失败，请重新登录。'
        booting.value = false
        return
    }
    if (data) {
        for (const key of ['code', 'state', 'provider']) url.searchParams.delete(key)
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
        await enterApp(data)
        return
    }
    await restoreSession()
}

onMounted(async () => {
    cloud.auth.onAuthStateChange((event, next) => {
        if (event === 'SIGNED_OUT' || !next) {
            session.value = null
            return
        }
        session.value = next
    })
    await bootstrap()
})

async function handleSignedIn() {
    const { data } = await cloud.auth.getSession()
    if (!data) {
        bootError.value = '登录未完成，请重试。'
        return
    }
    await enterApp(data)
}

async function signOut() {
    await cloud.auth.signOut()
    session.value = null
    activities.value = []
    signups.value = []
    selectedId.value = null
    mode.value = 'detail'
}

function selectActivity(id) {
    selectedId.value = id
    mode.value = 'detail'
}

function startCreate() {
    editingActivity.value = null
    mode.value = 'editor'
}

function startEdit(activity) {
    editingActivity.value = activity
    mode.value = 'editor'
}

function cancelEdit() {
    mode.value = 'detail'
}

async function handleSaved(row) {
    await loadAll()
    if (row && row.id) {
        selectedId.value = row.id
    }
    mode.value = 'detail'
    showToast('已保存')
}

async function handleDeleted(id) {
    if (selectedId.value === id) {
        selectedId.value = null
    }
    editingActivity.value = null
    mode.value = 'detail'
    await loadAll()
    showToast('活动已删除')
}
</script>

<template>
    <div v-if="booting" class="boot-screen">
        <div class="boot-mark">活动组织台</div>
        <div class="spinner"></div>
        <div class="boot-hint">正在校验登录状态…</div>
    </div>

    <LoginView v-else-if="!session" :boot-error="bootError" @signed-in="handleSignedIn" />

    <div v-else class="shell">
        <aside class="sidebar">
            <div class="brand">
                <span class="brand-mark">活</span>
                <div>
                    <div class="brand-name">活动组织台</div>
                    <div class="brand-sub">PC 编辑端</div>
                </div>
            </div>

            <button class="btn btn-primary btn-block" type="button" @click="startCreate">+ 新建活动</button>

            <div class="list-label">
                <span>活动</span>
                <span>{{ activities.length }}</span>
            </div>

            <div class="act-list">
                <button
                    v-for="activity in activities"
                    :key="activity.id"
                    class="act-item"
                    :class="{ active: activity.id === selectedId && mode === 'detail' }"
                    type="button"
                    @click="selectActivity(activity.id)"
                >
                    <span class="act-thumb" :style="thumbStyle(activity)">
                        <span v-if="!activity.cover_url">{{ (activity.title || '·').slice(0, 1) }}</span>
                    </span>
                    <span class="act-text">
                        <span class="act-title">{{ activity.title }}</span>
                        <span class="act-meta">{{ formatRange(activity.start_at, activity.end_at) || '未设置时间' }}</span>
                    </span>
                    <span class="act-count">{{ countOf(activity.id) }}</span>
                </button>
                <p v-if="!activities.length" class="empty-hint">还没有活动，点上面的「新建活动」开始。</p>
            </div>

            <div class="sidebar-footer">
                <div class="user-chip">
                    <span class="avatar">{{ userInitial }}</span>
                    <span class="user-name">{{ userName }}</span>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" @click="signOut">退出</button>
            </div>
        </aside>

        <main class="main">
            <ActivityEditor
                v-if="mode === 'editor'"
                :activity="editingActivity"
                :owner-name="userName"
                @saved="handleSaved"
                @deleted="handleDeleted"
                @cancel="cancelEdit"
            />

            <div v-else-if="selected" class="main-inner">
                <div class="detail-head">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
                            <h2 class="detail-title">{{ selected.title }}</h2>
                            <span class="badge" :class="{ draft: selected.status === 'draft' }">
                                {{ activityStatusLabel(selected.status) }}
                            </span>
                            <span v-if="!canEdit" class="badge readonly">只读</span>
                        </div>
                        <div class="detail-meta">
                            <span>{{ formatRange(selected.start_at, selected.end_at) || '未设置时间' }}</span>
                            <span>{{ selected.location || '未设置地点' }}</span>
                            <span>{{ signupsOfSelected.length }} 人已报名</span>
                        </div>
                    </div>
                    <div class="detail-actions">
                        <button v-if="canEdit" class="btn btn-primary btn-sm" type="button" @click="startEdit(selected)">
                            编辑
                        </button>
                        <button class="btn btn-outline btn-sm" type="button" @click="loadAll">刷新</button>
                    </div>
                </div>

                <div v-if="selected.description" class="panel">
                    <div class="panel-title" style="margin-bottom: 8px">活动介绍</div>
                    <div class="description">{{ selected.description }}</div>
                </div>

                <div class="panel">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">分享到微信</div>
                            <div class="panel-sub">
                                在手机小程序里打开这个活动，点右上角「…」转发给好友或群；好友点开卡片即可报名。
                            </div>
                        </div>
                    </div>
                    <div class="share-row">
                        <div class="code-chip">{{ pathOf(selected) }}</div>
                        <button class="btn btn-outline btn-sm" type="button" @click="copyText(pathOf(selected), '已复制小程序路径')">
                            复制路径
                        </button>
                        <button class="btn btn-outline btn-sm" type="button" @click="copyText(shareText, '已复制分享文案')">
                            复制文案
                        </button>
                    </div>
                    <p class="hint">{{ shareText }}</p>
                </div>

                <SignupPanel :activity="selected" :signups="signupsOfSelected" @refresh="loadAll" />
            </div>

            <div v-else class="blank">
                <div style="text-align: center">
                    <p style="margin-bottom: 12px">还没有选中活动。</p>
                    <button class="btn btn-primary btn-sm" type="button" @click="startCreate">创建第一个活动</button>
                </div>
            </div>
        </main>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
</template>
