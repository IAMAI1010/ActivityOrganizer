const STORAGE_KEY = 'activity-theme'
export const THEMES = ['light', 'dark', 'vivid']
export const THEME_LABELS = { light: '浅色', dark: '深色', vivid: '鲜艳' }

export function loadTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (THEMES.includes(saved)) return saved
    } catch (error) {
        /* localStorage 不可用时回落默认 */
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    }
    return 'light'
}

export function applyTheme(theme) {
    if (!THEMES.includes(theme)) return
    const root = document.documentElement
    root.dataset.theme = theme
    try {
        localStorage.setItem(STORAGE_KEY, theme)
    } catch (error) {
        /* 忽略持久化失败 */
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
        meta.setAttribute(
            'content',
            theme === 'dark' ? '#101113' : theme === 'vivid' ? '#ff4b12' : '#f4f3ef',
        )
    }
}
