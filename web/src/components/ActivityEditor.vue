<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { createActivity, updateActivity, deleteActivity } from '../api'
import { formatRange, fromLocalInput, toLocalInput } from '../format'
import { downloadPoster, renderPoster } from '../poster'
import AiBar from './AiBar.vue'

const props = defineProps({
    activity: { type: Object, default: null },
    ownerName: { type: String, default: '' },
})
const emit = defineEmits(['saved', 'cancel', 'deleted'])

const draft = reactive({
    title: '',
    description: '',
    location: '',
    start_at: '',
    end_at: '',
    cover_url: '',
    cover_spec: null,
    status: 'published',
})

const fields = ref([])
const saving = ref(false)
const removing = ref(false)
const errorMessage = ref('')
const introUndo = ref('')
const previewCanvas = ref(null)
const posterCanvas = ref(null)

const isEditing = computed(() => Boolean(props.activity && props.activity.id))

function loadFrom(activity) {
    draft.title = activity ? activity.title || '' : ''
    draft.description = activity ? activity.description || '' : ''
    draft.location = activity ? activity.location || '' : ''
    draft.start_at = activity ? toLocalInput(activity.start_at) : ''
    draft.end_at = activity ? toLocalInput(activity.end_at) : ''
    draft.cover_url = activity ? activity.cover_url || '' : ''
    draft.cover_spec = activity && activity.cover_spec ? activity.cover_spec : null
    draft.status = activity ? activity.status || 'published' : 'published'
    const raw = activity && Array.isArray(activity.form_fields) ? activity.form_fields : []
    fields.value = raw.map((field, index) => ({
        key: field.key || `field_${index + 1}`,
        label: field.label || '',
        type: field.type === 'textarea' || field.type === 'select' ? field.type : 'text',
        required: field.required === true,
        optionsText: Array.isArray(field.options) ? field.options.join('、') : '',
    }))
    errorMessage.value = ''
}

watch(() => props.activity, loadFrom, { immediate: true })

function addField() {
    fields.value.push({
        key: `field_${Date.now().toString(36)}`,
        label: '',
        type: 'text',
        required: false,
        optionsText: '',
    })
}

function removeField(index) {
    fields.value.splice(index, 1)
}

const previewRange = computed(() => formatRange(fromLocalInput(draft.start_at), fromLocalInput(draft.end_at)))

const posterMeta = computed(() => ({ title: draft.title, organizer: props.ownerName }))
const showPoster = computed(() => Boolean(draft.cover_spec) && !draft.cover_url.trim())

function paintPosters() {
    nextTick(() => {
        if (!showPoster.value) return
        if (previewCanvas.value) renderPoster(previewCanvas.value, draft.cover_spec, posterMeta.value)
        if (posterCanvas.value) renderPoster(posterCanvas.value, draft.cover_spec, posterMeta.value)
    })
}

watch(() => [draft.cover_spec, draft.title, draft.cover_url], paintPosters, { deep: true })

function applyExtract(data) {
    if (data.title) draft.title = data.title
    if (data.location) draft.location = data.location
    if (data.startAt) draft.start_at = data.startAt
    if (data.endAt) draft.end_at = data.endAt
    if (data.description) draft.description = data.description
    if (Array.isArray(data.fields) && data.fields.length) {
        fields.value = data.fields.map((field) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required === true,
            optionsText: (field.options || []).join('、'),
        }))
    }
    if (!draft.cover_spec) {
        const when = [draft.start_at ? draft.start_at.slice(5, 10).replace('-', '月') + '日' : '', draft.location]
            .filter(Boolean)
            .join(' · ')
        draft.cover_spec = {
            id: 'variant_auto',
            theme: data.theme,
            motif: data.motif,
            badge: draft.start_at ? formatBadge(draft.start_at) : '',
            headline: data.title || draft.title,
            subhead: when,
            footer: '扫码报名',
        }
    }
    errorMessage.value = ''
    paintPosters()
}

function formatBadge(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getMonth() + 1}月${date.getDate()}日 ${week} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function applyIntro(text) {
    if (!text) return
    introUndo.value = draft.description
    draft.description = text
}

function undoIntro() {
    draft.description = introUndo.value
    introUndo.value = ''
}

function applyPoster(variant) {
    draft.cover_spec = variant
    draft.cover_url = ''
    paintPosters()
}

function clearPoster() {
    draft.cover_spec = null
}

function downloadCurrentPoster() {
    if (!draft.cover_spec) return
    downloadPoster(draft.cover_spec, posterMeta.value, `${draft.title || '活动'}-封面.png`)
}

function buildPayload() {
    return {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        location: draft.location.trim() || null,
        start_at: fromLocalInput(draft.start_at),
        end_at: fromLocalInput(draft.end_at),
        cover_url: draft.cover_url.trim() || null,
        cover_spec: draft.cover_spec || null,
        status: draft.status,
        form_fields: fields.value
            .filter((field) => field.label.trim())
            .map((field, index) => ({
                key: field.key || `field_${index + 1}`,
                label: field.label.trim(),
                type: field.type,
                required: field.required === true,
                options:
                    field.type === 'select'
                        ? field.optionsText
                              .split(/[,，、\n]/)
                              .map((item) => item.trim())
                              .filter(Boolean)
                        : [],
            })),
    }
}

async function save() {
    if (saving.value) return
    const payload = buildPayload()
    if (!payload.title) {
        errorMessage.value = '请填写活动标题。'
        return
    }
    if (payload.start_at && payload.end_at && new Date(payload.end_at) < new Date(payload.start_at)) {
        errorMessage.value = '结束时间早于开始时间，请调整。'
        return
    }
    if (fields.value.some((field) => field.type === 'select' && field.label.trim() && !field.optionsText.trim())) {
        errorMessage.value = '下拉选择的字段需要填写选项，用逗号或顿号分隔。'
        return
    }

    errorMessage.value = ''
    saving.value = true
    const result = isEditing.value
        ? await updateActivity(props.activity.id, payload)
        : await createActivity({ ...payload, owner_name: props.ownerName || null })
    saving.value = false

    if (result.error) {
        errorMessage.value = result.error.message
        return
    }
    emit('saved', result.data)
}

async function remove() {
    if (!isEditing.value || removing.value) return
    const confirmed = window.confirm(
        `确认删除「${props.activity.title}」？该活动下的报名记录会一并删除，且无法恢复。`,
    )
    if (!confirmed) return
    removing.value = true
    const result = await deleteActivity(props.activity.id)
    removing.value = false
    if (result.error) {
        errorMessage.value = result.error.message
        return
    }
    emit('deleted', props.activity.id)
}
</script>

<template>
    <div class="main-inner">
        <div class="detail-head">
            <div>
                <h2 class="detail-title">{{ isEditing ? '编辑活动' : '新建活动' }}</h2>
                <div class="detail-meta">
                    <span>保存后即可在小程序里分享活动卡；状态为「草稿」时好友无法看到。</span>
                </div>
            </div>
        </div>

        <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

        <div class="editor-grid">
            <div>
                <AiBar
                    :draft="draft"
                    :organizer="ownerName"
                    @apply-extract="applyExtract"
                    @apply-intro="applyIntro"
                    @apply-poster="applyPoster"
                />

                <div class="panel">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">基本信息</div>
                            <div class="panel-sub">标题必填，时间和地点会显示在活动卡上。</div>
                        </div>
                    </div>

                    <div class="field">
                        <label class="label" for="ed-title">活动标题<span class="req">*</span></label>
                        <input id="ed-title" v-model="draft.title" class="input" placeholder="例如：周末徒步：梧桐山轻量线" />
                    </div>

                    <div class="field-row">
                        <div class="field">
                            <label class="label" for="ed-start">开始时间</label>
                            <input id="ed-start" v-model="draft.start_at" class="input" type="datetime-local" />
                        </div>
                        <div class="field">
                            <label class="label" for="ed-end">结束时间</label>
                            <input id="ed-end" v-model="draft.end_at" class="input" type="datetime-local" />
                        </div>
                    </div>

                    <div class="field" style="margin-bottom: 0">
                        <label class="label" for="ed-location">活动地点</label>
                        <input id="ed-location" v-model="draft.location" class="input" placeholder="例如：梧桐山北门集合点" />
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">活动内容</div>
                            <div class="panel-sub">封面图与介绍会一起出现在小程序的活动详情页。</div>
                        </div>
                    </div>

                    <div class="field">
                        <div class="cover-head">
                            <label class="label" for="ed-cover" style="margin-bottom: 0">封面</label>
                            <div class="cover-tools">
                                <button class="btn btn-outline btn-sm" type="button" :disabled="!draft.cover_spec" @click="downloadCurrentPoster">
                                    下载封面
                                </button>
                                <button class="btn btn-ghost btn-sm" type="button" :disabled="!draft.cover_spec" @click="clearPoster">
                                    清除
                                </button>
                            </div>
                        </div>

                        <div v-if="showPoster" class="cover-poster">
                            <canvas ref="posterCanvas" class="cover-poster-canvas"></canvas>
                            <p class="hint">
                                这张封面由 AI 定配色与排版、本地实时绘制，小程序里用同一份配方渲染，改文字会自动跟着变。
                            </p>
                        </div>

                        <input
                            id="ed-cover"
                            v-model="draft.cover_url"
                            class="input"
                            placeholder="也可以直接粘贴一个公开图片地址"
                        />
                        <p class="hint">填了图片地址就用图片；留空则用上面的 AI 封面或纯色占位。</p>
                    </div>

                    <div class="field" style="margin-bottom: 0">
                        <div class="cover-head">
                            <label class="label" for="ed-desc" style="margin-bottom: 0">活动介绍</label>
                            <button v-if="introUndo" class="btn btn-ghost btn-sm" type="button" @click="undoIntro">
                                还原为改写前
                            </button>
                        </div>
                        <textarea
                            id="ed-desc"
                            v-model="draft.description"
                            class="textarea"
                            placeholder="说明集合方式、行程安排、需要自带的东西等"
                        ></textarea>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">报名表字段</div>
                            <div class="panel-sub">微信昵称、姓名、手机号是固定字段，这里可以再加需要好友填写的信息。</div>
                        </div>
                        <button class="btn btn-outline btn-sm" type="button" @click="addField">+ 添加字段</button>
                    </div>

                    <div v-if="!fields.length" class="empty-table">还没有自定义字段，好友报名时只填昵称、姓名和手机号。</div>

                    <div v-for="(field, index) in fields" :key="field.key" class="field-card">
                        <div class="field-card-head">
                            <input v-model="field.label" class="input" placeholder="字段名称，如「同行人数」" />
                            <select v-model="field.type" class="select">
                                <option value="text">单行文本</option>
                                <option value="textarea">多行文本</option>
                                <option value="select">下拉选择</option>
                            </select>
                            <label class="checkbox">
                                <input v-model="field.required" type="checkbox" />
                                必填
                            </label>
                            <button class="btn btn-ghost btn-sm" type="button" title="删除字段" @click="removeField(index)">
                                ✕
                            </button>
                        </div>
                        <div v-if="field.type === 'select'" class="field-card-foot">
                            <input v-model="field.optionsText" class="input" placeholder="选项，用逗号或顿号分隔：1 人、2 人、3 人及以上" />
                        </div>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">发布状态</div>
                            <div class="panel-sub">草稿只有你自己能看到；已结束会停止接收报名。</div>
                        </div>
                    </div>

                    <div class="field" style="margin-bottom: 0">
                        <label class="label" for="ed-status">当前状态</label>
                        <select id="ed-status" v-model="draft.status" class="select">
                            <option value="published">已发布（好友可以报名）</option>
                            <option value="draft">草稿（仅自己可见）</option>
                            <option value="ended">已结束（不再接受报名）</option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn-primary" type="button" :disabled="saving" @click="save">
                        {{ saving ? '保存中…' : isEditing ? '保存修改' : '创建活动' }}
                    </button>
                    <button class="btn btn-outline" type="button" @click="emit('cancel')">取消</button>
                    <button v-if="isEditing" class="btn btn-danger" type="button" :disabled="removing" @click="remove">
                        {{ removing ? '删除中…' : '删除活动' }}
                    </button>
                </div>
            </div>

            <div class="sticky">
                <div class="panel-sub" style="margin-bottom: 8px">活动卡预览</div>
                <div class="preview-card">
                    <div
                        class="preview-cover"
                        :class="{ 'has-poster': showPoster }"
                        :style="draft.cover_url ? { backgroundImage: `url(${draft.cover_url})` } : null"
                    >
                        <canvas v-if="showPoster" ref="previewCanvas" class="preview-poster"></canvas>
                        <span v-else-if="!draft.cover_url">未设置封面</span>
                    </div>
                    <div class="preview-body">
                        <div class="preview-title">{{ draft.title || '活动标题' }}</div>
                        <div class="preview-meta">
                            <span>{{ previewRange || '未设置时间' }}</span>
                            <span>{{ draft.location || '未设置地点' }}</span>
                        </div>
                        <div class="preview-foot">
                            {{ draft.status === 'draft' ? '草稿 · 仅自己可见' : '已发布 · 好友可点击卡片报名' }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
