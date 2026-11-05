# -*- coding: utf-8 -*-
"""活动组织台 · 分享与扫码物料
配色：马卡龙抹茶  底 #E7F3DF / 主 #4A7A5C
图形：V4 立旗 + 三人（读取同目录 ActivityOrganizer-icon-1024.png）

用法：
  python build_materials.py                       # 生成分享图 5:4 / 1:1 + 海报模板 + 示例海报
  python build_materials.py --code 官方小程序码.png  # 把官方码合成进海报 -> poster-with-code.png
  python build_materials.py --code 码.png --overlay-logo   # 额外把头像叠到码中心（需真机验证扫码）

注意：本地不能生成真正可扫的小程序码，必须由微信服务端或公众平台后台提供。
"""
import argparse
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
ICON_PATH = os.path.join(BASE, "ActivityOrganizer-icon-1024.png")

CREAM = (231, 243, 223)      # #E7F3DF
MATCHA = (74, 122, 92)       # #4A7A5C
DEEP = (47, 79, 60)          # #2F4F3C
LIGHT = (200, 223, 184)      # #C8DFB8
MUTED = (122, 148, 126)
WHITE = (255, 255, 255)
WARNING = (200, 62, 62)


def font(size, bold=False):
    names = [r"C:\Windows\Fonts\msyhbd.ttc", r"C:\Windows\Fonts\msyh.ttc"] if bold \
        else [r"C:\Windows\Fonts\msyh.ttc"]
    names.append(r"C:\Windows\Fonts\simhei.ttf")
    for path in names:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_mask(size, ratio=0.22):
    scale = 4
    m = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1), radius=int(size * ratio * scale), fill=255
    )
    return m.resize((size, size), Image.LANCZOS)


def circle_mask(size):
    scale = 4
    m = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def paste_icon(sheet, size, xy, radius_ratio=0.22, circle=False):
    icon = Image.open(ICON_PATH).convert("RGB").resize((size, size), Image.LANCZOS)
    mask = circle_mask(size) if circle else rounded_mask(size, radius_ratio)
    xy = (int(round(xy[0])), int(round(xy[1])))
    sheet.paste(icon, xy, mask)


def paste_icon_badge(sheet, size, center_x, top, pad=12):
    """给图标加白色圆角底板：图标底色与页面底色相同，没有底板会读成「裸图形」。"""
    badge = size + pad * 2
    ImageDraw.Draw(sheet).rounded_rectangle(
        (center_x - badge / 2, top, center_x + badge / 2, top + badge),
        radius=badge * 0.26, fill=WHITE,
    )
    paste_icon(sheet, size, (center_x - size / 2, top + pad))


def center_text(draw, y, text, f, fill, width):
    box = draw.textbbox((0, 0), text, font=f)
    draw.text(((width - (box[2] - box[0])) / 2, y), text, font=f, fill=fill)


def draw_decor(draw, W, H):
    """极简背景装饰：两道浅色圆弧，不抢主体。"""
    r = int(W * 0.62)
    draw.ellipse((W - r // 2, -r // 2, W + r // 2, r // 2), outline=LIGHT, width=14)
    draw.ellipse((-r // 2, H - r // 3, r // 2, H + r * 2 // 3), outline=LIGHT, width=14)


def make_cover(width, height):
    """分享封面。5:4 用于 onShareAppMessage，1:1 用于 onShareTimeline / 收藏。"""
    sheet = Image.new("RGB", (width, height), CREAM)
    draw = ImageDraw.Draw(sheet)
    draw_decor(draw, width, height)

    icon_size = int(width * 0.20)
    # 5:4 纵向空间紧，头像上移；1:1 留白多，稍微下沉
    icon_y = int(height * (0.060 if height < width * 0.9 else 0.105))
    paste_icon_badge(sheet, icon_size, width // 2, icon_y, pad=14)

    title_size = int(width * 0.092)
    sub_size = int(width * 0.040)
    foot_size = int(width * 0.023)
    title_y = int(height * 0.395)
    sub_y = int(height * 0.565)

    center_text(draw, title_y, "活动组织台", font(title_size, True), DEEP, width)
    center_text(draw, sub_y, "发起活动 · 收集报名 · 一键导航", font(sub_size), MATCHA, width)

    line_w = int(width * 0.10)
    line_y = int(height * 0.705)
    draw.rounded_rectangle(
        ((width - line_w) // 2, line_y, (width + line_w) // 2, line_y + 4),
        radius=2, fill=LIGHT,
    )
    center_text(draw, int(height * 0.765), "组织活动，从这里开始", font(foot_size), MUTED, width)
    return sheet


# ---------- 小程序码海报 ----------

PW, PH = 800, 1200
CARD = (80, 270, 720, 1000)
CODE_BOX = (190, 350, 610, 770)   # 420×420


def dashed_rect(draw, box, color, width=3, dash=14, gap=10):
    x0, y0, x1, y1 = box
    for x in range(x0, x1, dash + gap):
        draw.line((x, y0, min(x + dash, x1), y0), fill=color, width=width)
        draw.line((x, y1, min(x + dash, x1), y1), fill=color, width=width)
    for y in range(y0, y1, dash + gap):
        draw.line((x0, y, x0, min(y + dash, y1)), fill=color, width=width)
        draw.line((x1, y, x1, min(y + dash, y1)), fill=color, width=width)


def make_demo_code(size=420):
    """示例占位码：内容是一段 DEMO 文本，扫码只会得到文字，不会跳到任何业务页面。"""
    try:
        import qrcode
        qr = qrcode.QRCode(version=4, error_correction=qrcode.constants.ERROR_CORRECT_H,
                           box_size=10, border=2)
        qr.add_data("DEMO / NOT A MINIPROGRAM CODE")
        qr.make(fit=True)
        img = qr.make_image(fill_color=(47, 79, 60), back_color="white").convert("RGB")
        return img.resize((size, size), Image.LANCZOS)
    except ImportError:
        img = Image.new("RGB", (size, size), WHITE)
        ImageDraw.Draw(img).rectangle((0, 0, size - 1, size - 1), outline=LIGHT, width=6)
        return img


def build_poster(code_img=None, overlay_logo=False, is_demo=False, is_template=False,
                 logo_ratio=0.22):
    sheet = Image.new("RGB", (PW, PH), CREAM)
    draw = ImageDraw.Draw(sheet)
    draw_decor(draw, PW, PH)

    # 顶部品牌区
    paste_icon_badge(sheet, 100, 130, 72, pad=10)
    draw.text((220, 73), "活动组织台", font=font(46, True), fill=DEEP)
    draw.text((222, 138), "发起活动 · 收集报名 · 一键导航", font=font(23), fill=MUTED)

    if is_template:
        tag = "物料模板 · 合成后使用"
        box = draw.textbbox((0, 0), tag, font=font(20))
        tw = box[2] - box[0]
        draw.rounded_rectangle((PW - 80 - tw - 28, 74, PW - 80, 118), radius=10, fill=WHITE)
        draw.text((PW - 80 - tw - 14, 82), tag, font=font(20), fill=DEEP)

    # 中部白卡
    draw.rounded_rectangle(CARD, radius=32, fill=WHITE)
    x0, y0, x1, y1 = CODE_BOX

    if code_img is None:
        dashed_rect(draw, CODE_BOX, LIGHT, width=3)
        center_text(draw, y0 + 150, "官方小程序码粘贴位", font(30, True), MATCHA, PW)
        center_text(draw, y0 + 205, "从公众平台后台下载，或用服务端接口生成", font(19), MUTED, PW)
        center_text(draw, y0 + 245, "（本地无法生成可扫的小程序码）", font(19), MUTED, PW)
    else:
        code = code_img.convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS)
        sheet.paste(code, (x0, y0))
        if overlay_logo:
            # 经验值：微信小程序码中心圆形区约占码宽 22%；不同版本可能不同，按实际调整。
            d = int((x1 - x0) * logo_ratio)
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            paste_icon(sheet, d, (cx - d // 2, cy - d // 2), circle=True)
        if is_demo:
            draw.rectangle((x0, y0 + 16, x1, y0 + 68), fill=WARNING)
            center_text(draw, y0 + 26, "示例占位 · 不可用于发布", font(26, True), WHITE, PW)

    if is_template:
        center_text(draw, y1 + 42, "长按识别小程序码 · 立即查看活动", font(30, True), DEEP, PW)
        center_text(draw, y1 + 92, "合成后将替换上方占位区", font(20), MUTED, PW)
    else:
        center_text(draw, y1 + 42, "长按识别小程序码 · 立即查看活动", font(30, True), DEEP, PW)
        center_text(draw, y1 + 92, "打开活动组织台，查看活动并报名", font(20), MUTED, PW)

    # 底部
    center_text(draw, 1062, "活动组织台", font(28), MATCHA, PW)
    center_text(draw, 1108, "组织活动，从这里开始", font(20), MUTED, PW)
    return sheet


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--code", help="官方小程序码图片路径（PNG/JPG，正方形）")
    ap.add_argument("--overlay-logo", action="store_true",
                    help="把头像叠加到码中心圆形区；叠加后务必用微信真机验证扫码")
    ap.add_argument("--logo-ratio", type=float, default=0.22, help="中心 logo 直径占码宽比例")
    args = ap.parse_args()

    # 1. 分享图（两种官方比例）
    for name, w, h in (("share-cover-5x4.png", 1000, 800), ("share-cover-1x1.png", 1000, 1000)):
        out = os.path.join(BASE, name)
        make_cover(w, h).save(out, "PNG", optimize=True)
        print(f"{name:32s} {w}×{h}  {os.path.getsize(out)/1024:6.1f} KB")

    # 2. 海报模板（明确占位）
    out = os.path.join(BASE, "poster-template.png")
    build_poster(code_img=None, is_template=True).save(out, "PNG", optimize=True)
    print(f"{'poster-template.png':32s} {PW}×{PH}  {os.path.getsize(out)/1024:6.1f} KB")

    # 3. 示例合成效果（占位码带明显警示，绝不会被误当真码）
    demo = build_poster(code_img=make_demo_code(), is_demo=True)
    out = os.path.join(BASE, "poster-demo.png")
    demo.save(out, "PNG", optimize=True)
    print(f"{'poster-demo.png':32s} {PW}×{PH}  {os.path.getsize(out)/1024:6.1f} KB")

    # 4. 若给了官方码，合成正式海报
    if args.code:
        path = args.code if os.path.isabs(args.code) else os.path.join(BASE, args.code)
        if not os.path.exists(path):
            raise SystemExit(f"找不到小程序码文件：{path}")
        img = Image.open(path)
        poster = build_poster(code_img=img, overlay_logo=args.overlay_logo,
                              logo_ratio=args.logo_ratio)
        out = os.path.join(BASE, "poster-with-code.png")
        poster.save(out, "PNG", optimize=True)
        print(f"{'poster-with-code.png':32s} {PW}×{PH}  {os.path.getsize(out)/1024:6.1f} KB")
        if args.overlay_logo:
            print("提醒：已叠加中心头像，请用微信真机扫码验证识别率后再印刷/发布。")
    print("done")


if __name__ == "__main__":
    main()
