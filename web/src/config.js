// 腾讯地图 key：优先使用构建时注入的 VITE_TMAP_KEY，其次读取浏览器本地临时覆盖。
// 正式部署请在项目根目录的 .env 里写 VITE_TMAP_KEY，并在腾讯位置服务控制台把线上域名加进白名单。
const KEY_STORAGE = 'activity_tmap_key'

function readLocalKey() {
    try {
        return String(window.localStorage.getItem(KEY_STORAGE) || '').trim()
    } catch (error) {
        return ''
    }
}

export function getTmapKey() {
    const fromEnv = String(import.meta.env.VITE_TMAP_KEY || '').trim()
    return fromEnv || readLocalKey()
}

export function saveTmapKey(key) {
    try {
        const value = String(key || '').trim()
        if (value) window.localStorage.setItem(KEY_STORAGE, value)
        else window.localStorage.removeItem(KEY_STORAGE)
        return true
    } catch (error) {
        return false
    }
}

// 是否已有构建期 key：没有时要提示用户当前用的是本地临时 key。
export function hasBuildTmapKey() {
    return Boolean(String(import.meta.env.VITE_TMAP_KEY || '').trim())
}
