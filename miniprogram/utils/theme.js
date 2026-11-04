const STORAGE_KEY = 'activity_theme';

const THEME_OPTIONS = [
    { key: 'light', label: '浅色' },
    { key: 'dark', label: '深色' },
    { key: 'vivid', label: '鲜艳' },
];

const CHROME = {
    light: {
        navigationBarBackgroundColor: '#ffffff',
        navigationBarTextStyle: 'black',
        backgroundColor: '#f5f7fa',
    },
    dark: {
        navigationBarBackgroundColor: '#17181b',
        navigationBarTextStyle: 'white',
        backgroundColor: '#101113',
    },
    vivid: {
        navigationBarBackgroundColor: '#ff4b12',
        navigationBarTextStyle: 'white',
        backgroundColor: '#fff7ef',
    },
};

function normalize(value) {
    return THEME_OPTIONS.some(item => item.key === value) ? value : 'light';
}

function getTheme() {
    try {
        return normalize(wx.getStorageSync(STORAGE_KEY));
    } catch (error) {
        return 'light';
    }
}

// 导航栏与下拉背景不属于页面节点，需要单独设置。
function applyChrome(theme) {
    const chrome = CHROME[normalize(theme)];
    wx.setNavigationBarColor({
        frontColor: chrome.navigationBarTextStyle === 'white' ? '#ffffff' : '#000000',
        backgroundColor: chrome.navigationBarBackgroundColor,
        animation: { duration: 120, timingFunc: 'easeIn' },
    });
    if (typeof wx.setBackgroundColor === 'function') {
        wx.setBackgroundColor({ backgroundColor: chrome.backgroundColor });
    }
}

function saveTheme(theme) {
    const next = normalize(theme);
    try {
        wx.setStorageSync(STORAGE_KEY, next);
    } catch (error) {
        /* 忽略存储失败，本次会话仍然生效 */
    }
    applyChrome(next);
    return next;
}

// 每个页面在 onShow 里调用，返回当前主题并同步导航栏。
function pageTheme() {
    const theme = getTheme();
    applyChrome(theme);
    return theme;
}

module.exports = { THEME_OPTIONS, getTheme, saveTheme, pageTheme };
