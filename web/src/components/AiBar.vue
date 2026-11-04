<script setup>
import { computed, onMounted, ref } from 'vue'
import { describeModel, extractActivity, makePosterSpec, rewriteIntro, AiError } from '../ai'
import PosterPicker from './PosterPicker.vue'

const props = defineProps({
    draft: { type: Object, required: true },
    organizer: { type: String, default: '' },
})
const emit = defineEmits(['apply-extract', 'apply-intro', 'apply-poster'])

const input = ref('')
const busy = ref('')
const errorMessage = ref('')
const missing = ref([])
const modelName = ref('')
const variants = ref([])
const showPicker = ref(false)
const streamText = ref('')

const meta = computed(() => ({
    title: props.draft.title,
    organizer: props.organizer,
}))

const statusText = computed(() => {
    if (busy.value === 'extract') return '正在识别活动信息…'
    if (busy.value === 'rewrite') return '正在改写介绍…'
    if (busy.value === 'poster') return '正在设计封面…'
    return modelName.value ? `引擎 ${modelName.value}` : '准备就绪'
})

const canUseDraft = computed(() => Boolean(props.draft.title && props.draft.title.trim()))

onMounted(async () => {
    modelName.value = await describeModel()
})

function resetError() {
    errorMessage.value = ''
}

function reportError(error) {
    if (error instanceof AiError) {
        errorMessage.value = error.message
    } else {
        errorMessage.value = error && error.message ? error.message : '操作失败，请重试。'
    }
}

async function runExtract() {
    if (busy.value) return
    resetError()
    missing.value = []
    if (input.value.trim().length < 6) {
        errorMessage.value = '先粘一段活动内容进来，比如时间、地点、做什么。'
        return
    }
    busy.value = 'extract'
    try {
        const data = await extractActivity(input.value)
        emit('apply-extract', data)
        missing.value = data.missing || []
    } catch (error) {
        reportError(error)
    } finally {
        busy.value = ''
    }
}

async function runRewrite() {
    if (busy.value || !canUseDraft.value) return
    resetError()
    busy.value = 'rewrite'
    streamText.value = ''
    try {
        const text = await rewriteIntro(
            {
                title: props.draft.title,
                description: props.draft.description,
                location: props.draft.location,
                startAt: props.draft.start_at,
                endAt: props.draft.end_at,
            },
            { onDelta: (chunk) => (streamText.value += chunk) },
        )
        emit('apply-intro', text)
        streamText.value = ''
    } catch (error) {
        reportError(error)
    } finally {
        busy.value = ''
    }
}

async function runPoster() {
    if (busy.value || !canUseDraft.value) return
    resetError()
    busy.value = 'poster'
    try {
        const result = await makePosterSpec({
            title: props.draft.title,
            summary: '',
            location: props.draft.location,
            startAt: props.draft.start_at,
            endAt: props.draft.end_at,
        })
        variants.value = result
        showPicker.value = true
    } catch (error) {
        reportError(error)
    } finally {
        busy.value = ''
    }
}

function adoptPoster(variant) {
    emit('apply-poster', variant)
    showPicker.value = false
}
</script>

<template>
    <div class="panel ai-panel">
        <div class="panel-head">
            <div>
                <div class="panel-title">
                    <span class="ai-mark">AI</span>
                    一段话生成活动
                </div>
                <div class="panel-sub">把微信群里的通知整段粘进来，自动整理成活动卡。</div>
            </div>
            <span class="ai-engine">{{ statusText }}</span>
        </div>

        <textarea
            v-model="input"
            class="textarea ai-input"
            rows="3"
            placeholder="例如：这周六上午九点半我们在香蜜公园东门集合，带孩子们做自然观察和树叶拓印，大概两个小时，中午一起吃饭。自带水壶和防晒，最多 12 组家庭，报名时说一下几个大人几个小孩。"
            :disabled="busy === 'extract'"
        ></textarea>

        <div class="ai-actions">
            <button class="btn btn-primary btn-sm" type="button" :disabled="Boolean(busy)" @click="runExtract">
                {{ busy === 'extract' ? '识别中…' : '识别并填充' }}
            </button>
            <button
                class="btn btn-outline btn-sm"
                type="button"
                :disabled="Boolean(busy) || !canUseDraft"
                @click="runRewrite"
            >
                {{ busy === 'rewrite' ? '改写中…' : '改写介绍' }}
            </button>
            <button
                class="btn btn-outline btn-sm"
                type="button"
                :disabled="Boolean(busy) || !canUseDraft"
                @click="runPoster"
            >
                {{ busy === 'poster' ? '设计中…' : '生成封面' }}
            </button>
            <span class="ai-note">识别会覆盖标题、时间、地点、介绍；封面与介绍可反复重做。</span>
        </div>

        <div v-if="busy === 'rewrite' && streamText" class="ai-stream">{{ streamText }}</div>

        <div v-if="errorMessage" class="auth-error" style="margin-top: 12px">{{ errorMessage }}</div>

        <div v-if="missing.length" class="ai-missing">
            原文里没提到：<strong>{{ missing.join('、') }}</strong>，请手动补一下再保存。
        </div>

        <PosterPicker
            v-if="showPicker"
            :variants="variants"
            :meta="meta"
            @adopt="adoptPoster"
            @close="showPicker = false"
        />
    </div>
</template>
