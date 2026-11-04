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

// 坐标转地址。失败时抛出带原因的 Error，交给调用方展示，不要吞掉鉴权类错误。
export async function reverseGeocode(TMap, latitude, longitude) {
    const geocoder = new TMap.service.Geocoder()
    let response
    try {
        response = await geocoder.getAddress({ location: new TMap.LatLng(latitude, longitude) })
    } catch (error) {
        throw new Error(describeServiceError(error))
    }
    const detail = response && (response.result || response)
    return (detail && detail.address) || ''
}

// 腾讯 WebService 的常见失败码翻译成人话，省得对着一串 status 猜。
function describeServiceError(error) {
    const status = error && (error.status || (error.data && error.data.status))
    if (status === 110) {
        const host = typeof location !== 'undefined' ? location.host : '当前域名'
        return `地图 key 未授权 ${host}，请把这个域名加进腾讯位置服务的 WebServiceAPI 域名白名单`
    }
    if (status === 199) return '这个地图 key 没有启用 WebServiceAPI，请在控制台给 key 勾选该项'
    if (status === 111 || status === 112) return '地图 key 已过期或被停用，请到腾讯位置服务检查'
    if (status === 120 || status === 121) {
        return '地图接口额度为 0 或今日已用完：到控制台「配额管理 → 账户额度 → 一键分配」，把额度分给这个 key'
    }
    return '地址解析失败，可以手动填写地点名称'
}

export function toCoord(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}
