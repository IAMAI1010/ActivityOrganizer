// 腾讯地图 URI API：在浏览器/微信里唤起地图并显示活动地点标记。
// 只做跳转，不渲染地图，因此不需要 key；referer 为必填的应用标识。
function coord(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

export function hasPoint(activity) {
    if (!activity) return false
    return coord(activity.latitude) !== null && coord(activity.longitude) !== null
}

export function tmapMarkerUri({ latitude, longitude, name, address }) {
    const lat = coord(latitude)
    const lng = coord(longitude)
    if (lat === null || lng === null) return ''
    const title = encodeURIComponent(name || '活动地点')
    const addr = encodeURIComponent(address || '')
    const marker = `coord:${lat},${lng};title:${title};addr:${addr}`
    return `https://apis.map.qq.com/uri/v1/marker?marker=${marker}&referer=activity-organizer`
}
