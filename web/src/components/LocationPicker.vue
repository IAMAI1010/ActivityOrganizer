<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getTmapKey, saveTmapKey } from '../config'
import { loadTMap, reverseGeocode, toCoord } from '../tmap'

const props = defineProps({
    open: { type: Boolean, default: false },
    address: { type: String, default: '' },
    latitude: { type: [Number, String], default: null },
    longitude: { type: [Number, String], default: null },
})
const emit = defineEmits(['close', 'pick'])

// 没有定位也没有历史坐标时的默认中心：深圳市民中心。只是初始视野，不代表用户位置。
const DEFAULT_CENTER = { latitude: 22.543096, longitude: 114.057865 }

const containerRef = ref(null)
const loading = ref(false)
const error = ref('')
const hint = ref('')
const needKey = ref(false)
const keyInput = ref('')
const geocoding = ref(false)
const locating = ref(false)
const picked = ref({ address: '', latitude: null, longitude: null })

let TMap = null
let map = null
let markers = null

const canConfirm = computed(
    () => picked.value.latitude !== null && picked.value.longitude !== null
)

function destroyMap() {
    if (map) {
        map.destroy()
        map = null
    }
    markers = null
}

function startPoint() {
    const latitude = toCoord(props.latitude)
    const longitude = toCoord(props.longitude)
    if (latitude !== null && longitude !== null) {
        return { latitude, longitude, fromExisting: true }
    }
    return { ...DEFAULT_CENTER, fromExisting: false }
}

async function setPoint(latitude, longitude, presetAddress) {
    picked.value = {
        address: presetAddress === undefined ? picked.value.address : presetAddress,
        latitude,
        longitude,
    }
    if (markers) {
        markers.setGeometries([
            { id: 'picked', position: new TMap.LatLng(latitude, longitude) },
        ])
    }
    if (presetAddress !== undefined) return

    geocoding.value = true
    try {
        const address = await reverseGeocode(TMap, latitude, longitude)
        if (address) picked.value = { ...picked.value, address }
    } catch (failure) {
        hint.value = '没能自动解析地址，你可以在下面手动补充地点名称。'
    } finally {
        geocoding.value = false
    }
}

async function initMap() {
    destroyMap()
    error.value = ''
    hint.value = ''
    const key = getTmapKey()
    if (!key) {
        needKey.value = true
        return
    }
    needKey.value = false
    loading.value = true
    try {
        TMap = await loadTMap(key)
        await nextTick()
        if (!containerRef.value) return
        const start = startPoint()
        map = new TMap.Map(containerRef.value, {
            zoom: start.fromExisting ? 16 : 12,
            center: new TMap.LatLng(start.latitude, start.longitude),
        })
        // 用 SDK 自带的默认标记样式，避免自定义图标在鉴权异常时静默不显示。
        markers = new TMap.MultiMarker({ map, geometries: [] })
        map.on('click', (event) => {
            const latLng = event && event.latLng
            if (latLng && typeof latLng.lat === 'number') setPoint(latLng.lat, latLng.lng)
        })
        if (start.fromExisting) setPoint(start.latitude, start.longitude, props.address || '')
    } catch (failure) {
        error.value = failure && failure.message ? failure.message : '地图加载失败，请稍后重试'
    } finally {
        loading.value = false
    }
}

function applyKey() {
    const value = keyInput.value.trim()
    if (!value) {
        error.value = '请先填入腾讯位置服务 key。'
        return
    }
    if (!saveTmapKey(value)) {
        error.value = '当前浏览器不允许保存本地数据，无法临时记住 key。'
        return
    }
    keyInput.value = ''
    initMap()
}

function locateMe() {
    if (!navigator.geolocation) {
        error.value = '当前浏览器不支持定位，请直接在地图上点选。'
        return
    }
    error.value = ''
    locating.value = true
    navigator.geolocation.getCurrentPosition(
        (position) => {
            locating.value = false
            if (!map) return
            const { latitude, longitude } = position.coords
            map.setCenter(new TMap.LatLng(latitude, longitude))
            map.setZoom(16)
            hint.value = '已按设备定位居中。电脑端定位偏差较大，请在地图上点一下确认准确位置。'
        },
        () => {
            locating.value = false
            error.value = '定位失败：可能是浏览器拒绝了授权，或当前环境不是 HTTPS。请直接在地图上点选。'
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
}

function confirm() {
    if (!canConfirm.value) return
    emit('pick', {
        address: picked.value.address.trim(),
        latitude: picked.value.latitude,
        longitude: picked.value.longitude,
    })
    emit('close')
}

watch(
    () => props.open,
    (open) => {
        if (!open) {
            destroyMap()
            return
        }
        picked.value = {
            address: props.address || '',
            latitude: toCoord(props.latitude),
            longitude: toCoord(props.longitude),
        }
        nextTick(initMap)
    }
)

onBeforeUnmount(destroyMap)
</script>

<template>
    <div v-if="open" class="modal-mask" role="dialog" aria-modal="true" aria-label="在地图上选择活动地点">
        <div class="modal map-modal">
            <div class="modal-head">
                <div>
                    <div class="panel-title">在地图上选点</div>
                    <div class="panel-sub">点击地图放置标记，会自动读取附近地址；确认后回填到活动地点。</div>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" @click="emit('close')">关闭</button>
            </div>

            <div v-if="needKey" class="map-key">
                <p class="hint">
                    还没有配置腾讯地图 key，地图无法显示。key 只保存在本机浏览器用于先验证效果；正式上线请用构建变量
                    <code>VITE_TMAP_KEY</code>，并把域名加入腾讯位置服务白名单。
                </p>
                <div class="map-key-row">
                    <input v-model="keyInput" class="input" placeholder="腾讯位置服务 key" />
                    <button class="btn btn-primary" type="button" @click="applyKey">保存并加载</button>
                </div>
            </div>

            <template v-else>
                <div class="map-toolbar">
                    <button class="btn btn-outline btn-sm" type="button" :disabled="locating" @click="locateMe">
                        {{ locating ? '定位中…' : '定位到我' }}
                    </button>
                    <span v-if="geocoding" class="map-status">正在解析地址…</span>
                    <span v-else-if="canConfirm" class="map-status">
                        {{ picked.latitude.toFixed(5) }}, {{ picked.longitude.toFixed(5) }}
                    </span>
                    <span v-else class="map-status">在地图上点一下选择位置</span>
                </div>

                <div v-if="error" class="map-error">{{ error }}</div>
                <div v-if="loading" class="map-loading">地图加载中…</div>
                <div ref="containerRef" class="map-canvas"></div>
                <p v-if="hint" class="hint map-hint">{{ hint }}</p>
            </template>

            <div v-if="!needKey" class="map-foot">
                <input v-model="picked.address" class="input" placeholder="地点名称，例如：梧桐山北门集合点" />
                <button class="btn btn-primary" type="button" :disabled="!canConfirm" @click="confirm">
                    使用此位置
                </button>
            </div>
        </div>
    </div>
</template>
