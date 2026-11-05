# -*- coding: utf-8 -*-
"""活动组织台 · 小程序头像定稿
方案：V4「立旗 + 三人」（集合出发）
配色：马卡龙抹茶  底 #E7F3DF / 符号 #4A7A5C

独立脚本，不依赖任何其他图片；重跑即可重新生成全部定稿产物。
输出：144（官方推荐上传）/ 300 / 1024 PNG + 定稿预览图。
"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
CREAM = (231, 243, 223)      # #E7F3DF
MATCHA = (74, 122, 92)       # #4A7A5C
SHEET_BG = (250, 250, 247)
CARD_BG = (241, 244, 238)
INK = (40, 52, 44)
MUTED = (108, 124, 112)


# ---------- 图标绘制 ----------

def draw_bust(draw, cx, base_y, width, head_r, color, overlap=0.62):
    """单个人形半身：半圆肩 + 压在肩上的圆头，颈部留凹口（避免读成圆点）。"""
    radius = width / 2
    draw.pieslice(
        (cx - radius, base_y - radius, cx + radius, base_y + radius), 180, 360, fill=color
    )
    head_cy = base_y - radius - head_r * overlap + head_r * 0.45
    draw.ellipse((cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r), fill=color)


def build_icon(S=2048):
    """V4：三个人并立 + 左侧立旗，底线齐平。"""
    img = Image.new("RGB", (S, S), CREAM)
    draw = ImageDraw.Draw(img)
    cx = S / 2 + S * 0.022          # 整体略右移，给旗帜留气口
    base_y = S * 0.685
    for shift in (-S * 0.152, 0, S * 0.152):
        draw_bust(draw, cx + shift, base_y, S * 0.180, S * 0.056, MATCHA)
    pole_x = cx - S * 0.268
    pole_w = S * 0.018
    draw.rounded_rectangle(
        (pole_x - pole_w / 2, S * 0.235, pole_x + pole_w / 2, base_y),
        radius=pole_w / 2, fill=MATCHA,
    )
    draw.polygon(
        [(pole_x + pole_w / 2, S * 0.235), (pole_x + S * 0.146, S * 0.288),
         (pole_x + pole_w / 2, S * 0.341)],
        fill=MATCHA,
    )
    return img


def mask_rounded(size, ratio=0.225):
    scale = 4
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1), radius=int(size * ratio * scale), fill=255
    )
    return big.resize((size, size), Image.LANCZOS)


def mask_circle(size):
    scale = 4
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    return big.resize((size, size), Image.LANCZOS)


def load_font(size):
    for path in (r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


# ---------- 导出 ----------

def export_icons(src):
    """2048 -> 1024 -> 目标尺寸，逐级 LANCZOS 保证边缘干净。"""
    mid = src.resize((1024, 1024), Image.LANCZOS)
    paths = {}
    for size in (144, 300, 1024):
        out = os.path.join(BASE, f"ActivityOrganizer-icon-{size}.png")
        (mid if size == 1024 else mid.resize((size, size), Image.LANCZOS)).save(
            out, "PNG", optimize=True
        )
        paths[size] = out
        print(f"{os.path.basename(out):42s} {os.path.getsize(out) / 1024:6.1f} KB")
    return paths


# ---------- 定稿预览 ----------

def build_preview(icon_1024, paths):
    W, H = 1120, 820
    sheet = Image.new("RGB", (W, H), SHEET_BG)
    draw = ImageDraw.Draw(sheet)
    f_title, f_sub = load_font(38), load_font(20)
    f_h, f_body, f_small = load_font(23), load_font(19), load_font(16)
    f_big = load_font(27)

    draw.text((56, 42), "活动组织台 · 小程序头像定稿", font=f_title, fill=INK)
    draw.text((56, 100), "V4  立旗 + 三人（集合出发）    |    马卡龙抹茶  #E7F3DF / #4A7A5C",
              font=f_sub, fill=MUTED)
    draw.line((56, 148, W - 56, 148), fill=(222, 228, 218), width=2)

    # 左：大图
    big = 320
    sheet.paste(icon_1024.resize((big, big), Image.LANCZOS), (56, 190), mask_rounded(big))
    draw.text((56, 524), "144 × 144  推荐上传", font=f_big, fill=INK)
    draw.text((56, 566), "PNG · 正方形 · 居中留边", font=f_body, fill=MUTED)

    # 右：微信内显示效果卡片
    card = (436, 190, W - 56, 600)
    draw.rounded_rectangle(card, radius=18, fill=CARD_BG)
    draw.text((466, 214), "微信内显示效果", font=f_h, fill=INK)

    smalls = [(96, "圆角 96px", False), (64, "圆形 64px", True), (44, "圆角 44px", False)]
    x = 470
    for s, tag, circle in smalls:
        thumb = icon_1024.resize((s, s), Image.LANCZOS)
        y = 280
        sheet.paste(thumb, (x, y), mask_circle(s) if circle else mask_rounded(s))
        draw.text((x, 396), tag, font=f_small, fill=MUTED)   # 标签统一基线
        x += 150

    # 模拟列表行
    row_y = 448
    thumb44 = icon_1024.resize((44, 44), Image.LANCZOS)
    sheet.paste(thumb44, (470, row_y), mask_rounded(44))
    draw.text((530, row_y - 2), "活动组织台", font=f_body, fill=INK)
    draw.text((530, row_y + 24), "活动报名 · 小程序", font=f_small, fill=MUTED)
    draw.rounded_rectangle((470, row_y + 56, 1010, row_y + 58), radius=1, fill=(222, 228, 218))

    # 底部规格区
    draw.line((56, 630, W - 56, 630), fill=(222, 228, 218), width=2)
    specs = [
        ("格式 / 尺寸", "PNG  144×144", "300 / 1024 备用"),
        ("文件大小", f"{os.path.getsize(paths[144]) / 1024:.1f} KB", "远低于 2MB 上限"),
        ("对比度", "4.32 : 1", "高于 3:1 可读门槛"),
        ("上传位置", "公众平台 → 设置", "基本设置 → 小程序头像"),
    ]
    col_w = (W - 112) // 4
    for i, (head, main, note) in enumerate(specs):
        x = 56 + i * col_w
        draw.text((x, 656), head, font=f_small, fill=MUTED)
        draw.text((x, 686), main, font=f_body, fill=INK)
        draw.text((x, 718), note, font=f_small, fill=MUTED)
    draw.text((56, 772), "上传前请确认：头像修改次数有限（以后台显示为准），圆角/圆形裁切已预留安全边距。",
              font=f_small, fill=MUTED)

    out = os.path.join(BASE, "preview-final.png")
    sheet.save(out, "PNG", optimize=True)
    print(f"{os.path.basename(out):42s} {os.path.getsize(out) / 1024:6.1f} KB")
    return out


def main():
    src = build_icon()
    paths = export_icons(src)
    build_preview(Image.open(paths[1024]).convert("RGB"), paths)
    print("done")


if __name__ == "__main__":
    main()
