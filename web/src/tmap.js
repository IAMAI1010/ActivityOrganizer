// 腾讯地图 GL JS 按需加载。地图只能使用合规服务商（腾讯/高德/百度/天地图），这里固定腾讯。
const SDK_BASE = 'https://map.qq.com/api/gljs?v=1.exp&libraries=service'

let pending = null

export function loadTMap(key, { timeout = 12000 } = {}) {
    if (window.TMap && window.TMap.Map) return Promise.resolve(window.TMap)
    if (pending) return pending

    pending = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `${SDK_BASE}&key=${encodeURIComponent(key)}`
        script.async = true

        const timer = window.setTimeout(() => {
            cleanup()
            pending = null
            reject(new Error('地图加载超时，请检查网络后重试'))
        }, timeout)

        function cleanup() {
            window.clearTimeout(timer)
            script.onload = null
            script.onerror = null
        }

        script.onload = () => {
            cleanup()
            pending = null
            if (window.TMap && window.TMap.Map) {
                resolve(window.TMap)
            } else {
                reject(new Error('地图脚本已加载但未初始化，通常是 key 无效或当前域名不在白名单'))
            }
        }
        script.onerror = () => {
            cleanup()
            pending = null
            reject(new Error('地图脚本加载失败，请检查网络或 key 是否正确'))
        }
        document.head.appendChild(script)
    })

    return pending
}

// 坐标转地址。失败不抛出，返回空字符串由调用方决定是否保留用户已填地址。
export async function reverseGeocode(TMap, latitude, longitude) {
    const geocoder = new TMap.service.Geocoder()
    const response = await geocoder.getAddress({ location: new TMap.LatLng(latitude, longitude) })
    const detail = response && (response.result || response)
    return (detail && detail.address) || ''
}

export function toCoord(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}
