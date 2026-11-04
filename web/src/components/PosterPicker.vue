<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { renderPoster } from '../poster'

const props = defineProps({
    variants: { type: Array, default: () => [] },
    meta: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['adopt', 'close'])

const canvasRefs = ref([])

function paint() {
    props.variants.forEach((variant, index) => {
        const canvas = canvasRefs.value[index]
        if (canvas) renderPoster(canvas, variant, props.meta)
    })
}

onMounted(() => nextTick(paint))
watch(() => props.variants, () => nextTick(paint), { deep: true })

function adopt(variant) {
    emit('adopt', variant)
}
</script>

<template>
    <div class="modal-mask" role="dialog" aria-modal="true" aria-label="选择封面方案">
        <div class="modal">
            <div class="modal-head">
                <div>
                    <div class="panel-title">挑一张封面</div>
                    <div class="panel-sub">三个方案由 AI 配色与排版生成，文字是实时绘制的，不会糊。</div>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" @click="emit('close')">关闭</button>
            </div>

            <div class="poster-grid">
                <button
                    v-for="(variant, index) in variants"
                    :key="variant.id"
                    class="poster-item"
                    type="button"
                    @click="adopt(variant)"
                >
                    <canvas :ref="(el) => (canvasRefs[index] = el)" class="poster-canvas"></canvas>
                    <span class="poster-pick">使用这一张</span>
                </button>
            </div>
        </div>
    </div>
</template>
