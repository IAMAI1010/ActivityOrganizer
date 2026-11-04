// 海报渲染：把「版面配方」画成 1080×1350 的图，不依赖任何图像模型。
// 之所以不用云存储存图片：平台只签发最长 1 小时的签名链接，公开链接不开放，
// 存下来的地址过一会儿就打不开了。改成存配方、两端各自渲染，永不过期。

export const POSTER_WIDTH = 1080
export const POSTER_HEIGHT = 1350

export const POSTER_THEMES = {
    forest: { from: '#0d2a21', to: '#1c5642', ink: '#f3f8f4', dim: 'rgba(243,248,244,0.70)', accent: '#9ad9b0', glow: 'rgba(154,217,176,0.16)' },
    sunset: { from: '#2b0f04', to: '#7a3410', ink: '#fff4e8', dim: 'rgba(255,244,232,0.74)', accent: '#ffb257', glow: 'rgba(255,178,87,0.18)' },
    ink: { from: '#0e0f11', to: '#22252a', ink: '#f5f5f3', dim: 'rgba(245,245,243,0.66)', accent: '#e2b566', glow: 'rgba(226,181,102,0.16)' },
    paper: { from: '#f7f2e8', to: '#e9dfcb', ink: '#28221a', dim: 'rgba(40,34,26,0.62)', accent: '#b4512b', glow: 'rgba(180,81,43,0.14)', light: true },
    coral: { from: '#fff3ec', to: '#ffdccb', ink: '#3a1c12', dim: 'rgba(58,28,18,0.62)', accent: '#ff4b12', glow: 'rgba(255,75,18,0.14)', light: true },
}

export const POSTER_MOTIFS = ['mountain', 'leaf', 'sun', 'confetti', 'wave', 'grid']

const FONT_STACK = `'PingFang SC','Hiragino Sans GB','Microsoft YaHei',system-ui,-apple-system,sans-serif`

function themeOf(spec) {
    return POSTER_THEMES[spec && spec.theme] || POSTER_THEMES.forest
}

function isLight(theme) {
    return theme.light === true
}

// 中文按字切、英文数字按词切，避免把单词拆断。
function tokenize(text) {
    return String(text || '').match(/[A-Za-z0-9]+[’'\-]?[A-Za-z0-9]*|[^\s]/g) || []
}

function wrapText(ctx, text, maxWidth) {
    const lines = []
    let line = ''
    for (const token of tokenize(text)) {
        const candidate = line + token
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line)
            line = token
        } else {
            line = candidate
        }
    }
    if (line) lines.push(line)
    return lines
}

function fitHeadline(ctx, text, maxWidth, { maxLines = 3, from = 112, to = 56 } = {}) {
    for (let size = from; size >= to; size -= 4) {
        ctx.font = `700 ${size}px ${FONT_STACK}`
        const lines = wrapText(ctx, text, maxWidth)
        if (lines.length <= maxLines && lines.every((line) => ctx.measureText(line).width <= maxWidth)) {
            return { size, lines }
        }
    }
    ctx.font = `700 ${to}px ${FONT_STACK}`
    return { size: to, lines: wrapText(ctx, text, maxWidth).slice(0, maxLines) }
}

function drawMotif(ctx, motif, theme, W, H) {
    ctx.save()
    ctx.globalAlpha = 1
    const accent = theme.accent
    const glow = theme.glow

    if (motif === 'mountain') {
        const layers = [
            { y: H * 0.62, h: H * 0.26, alpha: 0.10, points: [[0, 0.5], [0.18, 0.18], [0.34, 0.46], [0.52, 0.06], [0.72, 0.42], [0.86, 0.2], [1, 0.5]] },
            { y: H * 0.74, h: H * 0.3, alpha: 0.16, points: [[0, 0.62], [0.22, 0.28], [0.4, 0.58], [0.6, 0.22], [0.8, 0.54], [1, 0.34]] },
            { y: H * 0.86, h: H * 0.24, alpha: 0.24, points: [[0, 0.4], [0.2, 0.7], [0.4, 0.3], [0.62, 0.66], [0.82, 0.36], [1, 0.6]] },
        ]
        layers.forEach((layer) => {
            ctx.beginPath()
            ctx.moveTo(0, H)
            layer.points.forEach(([x, y]) => ctx.lineTo(x * W, layer.y + y * layer.h))
            ctx.lineTo(W, H)
            ctx.closePath()
            ctx.fillStyle = accent
            ctx.globalAlpha = layer.alpha
            ctx.fill()
        })
    }

    if (motif === 'wave') {
        for (let i = 0; i < 5; i += 1) {
            ctx.beginPath()
            const base = H * (0.66 + i * 0.07)
            ctx.moveTo(0, base)
            for (let x = 0; x <= W; x += 20) {
                ctx.lineTo(x, base + Math.sin((x / W) * Math.PI * 2 + i) * 34)
            }
            ctx.strokeStyle = accent
            ctx.globalAlpha = 0.18 - i * 0.02
            ctx.lineWidth = 3
            ctx.stroke()
        }
    }

    if (motif === 'sun') {
        const cx = W * 0.78
        const cy = H * 0.2
        for (let i = 4; i >= 1; i -= 1) {
            ctx.beginPath()
            ctx.arc(cx, cy, 90 + i * 62, 0, Math.PI * 2)
            ctx.fillStyle = glow
            ctx.globalAlpha = 1
            ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(cx, cy, 96, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.5
        ctx.fill()
    }

    if (motif === 'leaf') {
        const leaves = [
            [W * 0.82, H * 0.14, 150, -0.5],
            [W * 0.68, H * 0.1, 110, -1.1],
            [W * 0.92, H * 0.3, 90, 0.3],
            [W * 0.14, H * 0.84, 130, 1.9],
            [W * 0.26, H * 0.9, 84, 2.4],
        ]
        leaves.forEach(([x, y, r, rot], index) => {
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(rot)
            ctx.beginPath()
            ctx.ellipse(0, 0, r * 0.42, r, 0, 0, Math.PI * 2)
            ctx.fillStyle = accent
            ctx.globalAlpha = index % 2 === 0 ? 0.14 : 0.2
            ctx.fill()
            ctx.restore()
        })
    }

    if (motif === 'confetti') {
        const seeds = [
            [0.12, 0.16, 26, 0.3], [0.24, 0.3, 18, 1.1], [0.86, 0.22, 22, 0.8],
            [0.74, 0.12, 14, 2.2], [0.92, 0.42, 30, 1.6], [0.08, 0.52, 16, 0.4],
            [0.78, 0.62, 24, 2.8], [0.18, 0.68, 20, 1.9], [0.62, 0.5, 12, 0.7],
            [0.4, 0.14, 16, 2.4], [0.9, 0.72, 18, 1.2], [0.3, 0.86, 22, 0.2],
        ]
        seeds.forEach(([x, y, size, rot], index) => {
            ctx.save()
            ctx.translate(x * W, y * H)
            ctx.rotate(rot)
            ctx.fillStyle = accent
            ctx.globalAlpha = index % 3 === 0 ? 0.22 : 0.13
            if (index % 3 === 0) {
                ctx.beginPath()
                ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2)
                ctx.fill()
            } else {
                ctx.fillRect(-size / 2, -size / 2, size, size * 0.42)
            }
            ctx.restore()
        })
    }

    if (motif === 'grid') {
        ctx.strokeStyle = accent
        ctx.globalAlpha = isLight(theme) ? 0.3 : 0.16
        ctx.lineWidth = 2.5
        const step = 72
        for (let x = 0; x <= W; x += step) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, H)
            ctx.stroke()
        }
        for (let y = 0; y <= H; y += step) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(W, y)
            ctx.stroke()
        }
    }

    ctx.restore()
}

function drawBadge(ctx, text, x, y, theme) {
    if (!text) return y
    ctx.font = `500 30px ${FONT_STACK}`
    const width = ctx.measureText(text).width
    const padX = 26
    const height = 62
    ctx.beginPath()
    const r = height / 2
    ctx.roundRect(x, y, width + padX * 2, height, r)
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.16
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = theme.accent
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + padX, y + height / 2 + 1)
    ctx.textBaseline = 'alphabetic'
    return y + height
}

/**
 * 把配方画到 canvas 上。meta 提供组织者与时间等补充信息。
 */
export function renderPoster(canvas, spec, meta = {}) {
    const theme = themeOf(spec)
    const W = POSTER_WIDTH
    const H = POSTER_HEIGHT
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas

    ctx.clearRect(0, 0, W, H)

    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
    bg.addColorStop(0, theme.from)
    bg.addColorStop(1, theme.to)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    drawMotif(ctx, spec && spec.motif, theme, W, H)

    const pad = 96
    const contentWidth = W - pad * 2

    // 顶部小标签
    let badgeBottom = 110
    if (spec && spec.badge) {
        badgeBottom = drawBadge(ctx, spec.badge, pad, 112, theme)
    }

    // 先量出标题与副标题占多高，再整体贴底排版，避免下半部大片留白
    const headline = (spec && spec.headline) || meta.title || '活动'
    const fitted = fitHeadline(ctx, headline, contentWidth)
    const lineHeight = fitted.size * 1.22

    let subLines = []
    if (spec && spec.subhead) {
        ctx.font = `400 38px ${FONT_STACK}`
        subLines = wrapText(ctx, spec.subhead, contentWidth).slice(0, 2)
    }

    const blockHeight =
        fitted.lines.length * lineHeight + 26 + 60 + (subLines.length ? subLines.length * 58 + 10 : 0)
    const footerY = H - 148
    const blockTop = Math.max(badgeBottom + 56, Math.min(footerY - 70 - blockHeight, H * 0.5))

    // 主标题
    ctx.fillStyle = theme.ink
    ctx.textAlign = 'left'
    ctx.font = `700 ${fitted.size}px ${FONT_STACK}`
    fitted.lines.forEach((line, index) => {
        ctx.fillText(line, pad, blockTop + fitted.size * 0.92 + index * lineHeight)
    })
    let cursorY = blockTop + fitted.lines.length * lineHeight + 26

    // 分隔线
    ctx.beginPath()
    ctx.moveTo(pad, cursorY)
    ctx.lineTo(pad + 132, cursorY)
    ctx.lineWidth = 6
    ctx.strokeStyle = theme.accent
    ctx.stroke()
    cursorY += 60

    // 副标题（时间 / 地点）
    if (subLines.length) {
        ctx.font = `400 38px ${FONT_STACK}`
        ctx.fillStyle = theme.dim
        subLines.forEach((line, index) => {
            ctx.fillText(line, pad, cursorY + 34 + index * 58)
        })
    }

    // 页脚分隔线
    ctx.beginPath()
    ctx.moveTo(pad, footerY - 46)
    ctx.lineTo(W - pad, footerY - 46)
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = 0.22
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.globalAlpha = 1

    // 底部：组织者 + 报名角标
    ctx.font = `400 30px ${FONT_STACK}`
    ctx.fillStyle = theme.ink
    ctx.globalAlpha = 0.72
    if (meta.organizer) {
        ctx.fillText(`组织者 ${meta.organizer}`, pad, footerY + 18)
    }
    ctx.globalAlpha = 1

    const footerText = (spec && spec.footer) || '扫码报名'
    ctx.font = `600 32px ${FONT_STACK}`
    const footerWidth = ctx.measureText(footerText).width
    const chipW = footerWidth + 64
    const chipH = 76
    const chipX = W - pad - chipW
    const chipY = footerY - 26
    ctx.beginPath()
    ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2)
    ctx.fillStyle = theme.accent
    ctx.fill()
    ctx.fillStyle = isLight(theme) ? '#fffaf4' : '#10201a'
    ctx.textBaseline = 'middle'
    ctx.fillText(footerText, chipX + 32, chipY + chipH / 2 + 1)
    ctx.textBaseline = 'alphabetic'

    return canvas
}

/**
 * 渲染并导出 dataURL，同时返回调色板信息供小程序端复用。
 */
export function posterDataUrl(spec, meta) {
    const canvas = document.createElement('canvas')
    renderPoster(canvas, spec, meta)
    return canvas.toDataURL('image/png')
}

export function posterStyle(spec) {
    const theme = themeOf(spec)
    return {
        background: `linear-gradient(150deg, ${theme.from} 0%, ${theme.to} 100%)`,
        color: theme.ink,
        accent: theme.accent,
        dim: theme.dim,
    }
}

export function downloadPoster(spec, meta, filename = '活动封面.png') {
    const canvas = document.createElement('canvas')
    renderPoster(canvas, spec, meta)
    canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 2000)
    }, 'image/png')
}
