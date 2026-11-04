// 海报配方 → 小程序端样式。
// 与网页端共用同一份配色定义：数据库只存配方，两端各自渲染，图片永远不过期。

const THEMES = {
    forest: { from: '#0d2a21', to: '#1c5642', ink: '#f3f8f4', dim: 'rgba(243,248,244,0.70)', accent: '#9ad9b0' },
    sunset: { from: '#2b0f04', to: '#7a3410', ink: '#fff4e8', dim: 'rgba(255,244,232,0.74)', accent: '#ffb257' },
    ink: { from: '#0e0f11', to: '#22252a', ink: '#f5f5f3', dim: 'rgba(245,245,243,0.66)', accent: '#e2b566' },
    paper: { from: '#f7f2e8', to: '#e9dfcb', ink: '#28221a', dim: 'rgba(40,34,26,0.62)', accent: '#b4512b', light: true },
    coral: { from: '#fff3ec', to: '#ffdccb', ink: '#3a1c12', dim: 'rgba(58,28,18,0.62)', accent: '#ff4b12', light: true },
};

const SHAPES = {
    sun: [
        { x: 52, y: -14, w: 72, h: 58, r: '50%', o: 0.16 },
        { x: 62, y: -4, w: 46, h: 37, r: '50%', o: 0.22 },
    ],
    leaf: [
        { x: 60, y: -8, w: 26, h: 34, r: '50%', o: 0.16, rot: -24 },
        { x: 74, y: 6, w: 18, h: 24, r: '50%', o: 0.2, rot: -10 },
        { x: -8, y: 72, w: 26, h: 30, r: '50%', o: 0.12, rot: 22 },
    ],
    confetti: [
        { x: 8, y: 12, w: 6, h: 3, r: '2rpx', o: 0.22, rot: 18 },
        { x: 82, y: 20, w: 8, h: 4, r: '2rpx', o: 0.18, rot: -12 },
        { x: 68, y: 8, w: 4, h: 4, r: '50%', o: 0.24 },
        { x: 18, y: 62, w: 7, h: 3, r: '2rpx', o: 0.16, rot: 30 },
        { x: 88, y: 58, w: 4, h: 4, r: '50%', o: 0.2 },
    ],
    wave: [
        { x: -10, y: 78, w: 120, h: 1.2, r: '999rpx', o: 0.16 },
        { x: -10, y: 84, w: 120, h: 1.2, r: '999rpx', o: 0.12 },
        { x: -10, y: 90, w: 120, h: 1.2, r: '999rpx', o: 0.09 },
    ],
    mountain: [
        { x: 4, y: 76, w: 42, h: 42, r: '8rpx', o: 0.12, rot: 45 },
        { x: 40, y: 82, w: 54, h: 54, r: '8rpx', o: 0.16, rot: 45 },
        { x: 76, y: 74, w: 38, h: 38, r: '8rpx', o: 0.1, rot: 45 },
    ],
    grid: [
        { x: -12, y: -16, w: 56, h: 56, r: '12rpx', o: 0.1, rot: 18 },
        { x: 62, y: 48, w: 52, h: 52, r: '12rpx', o: 0.08, rot: -14 },
    ],
};

function buildPoster(spec) {
    if (!spec || !spec.headline) return null;
    const theme = THEMES[spec.theme] || THEMES.forest;
    const shapes = (SHAPES[spec.motif] || SHAPES.mountain).map((shape, index) => ({
        id: index,
        style: [
            `left:${shape.x}%`,
            `top:${shape.y}%`,
            `width:${shape.w}%`,
            `height:${shape.h}%`,
            `border-radius:${shape.r}`,
            `background:${theme.accent}`,
            `opacity:${shape.o}`,
            `transform:rotate(${shape.rot || 0}deg)`,
        ].join(';'),
    }));

    return {
        style: `background-image:linear-gradient(150deg, ${theme.from} 0%, ${theme.to} 100%);`,
        ink: theme.ink,
        accent: theme.accent,
        dim: theme.dim,
        badge: spec.badge || '',
        badgeStyle: `color:${theme.accent};border:1rpx solid ${theme.accent};`,
        headline: spec.headline,
        subhead: spec.subhead || '',
        footer: spec.footer || '扫码报名',
        chipStyle: `background:${theme.accent};color:${theme.light ? '#fffaf4' : '#10201a'};`,
        ruleStyle: `background:${theme.accent};`,
        shapes,
    };
}

module.exports = { buildPoster, THEMES };
