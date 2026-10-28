# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
import io, base64, json

S = 4          # 超采样倍数
N = 140        # 成品尺寸
W = H = N * S

def canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def finish(im, name):
    im = im.resize((N, N), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=90, method=6)
    d = base64.b64encode(buf.getvalue()).decode()
    return {"name": name, "b64": "data:image/webp;base64," + d, "bytes": len(d)}

def shade(c, f):
    return tuple(max(0, min(255, int(x * f))) for x in c[:3]) + (c[3],)

# ---------- 草莓 ----------
def strawberry():
    im = canvas(); d = ImageDraw.Draw(im)
    red = (244, 63, 94, 255); red_d = (190, 18, 60, 255)
    # 身体：上宽下尖
    cx = W / 2
    d.ellipse([cx-150, 120, cx+150, 380], fill=red)          # 上部圆
    d.polygon([(cx-150, 300), (cx+150, 300), (cx, 470)], fill=red)   # 尖底
    d.polygon([(cx-110, 320), (cx+110, 320), (cx, 440)], fill=shade(red, .88))  # 底部暗面
    # 籽
    import random
    random.seed(7)
    for i in range(16):
        a = -0.9 + 1.8 * (i % 4) / 3.0
        r = 60 + (i // 4) * 42
        x = cx + r * a * 0.92; y = 190 + (i // 4) * 52
        d.ellipse([x-7, y-10, x+7, y+10], fill=(253, 230, 138, 255))
    # 高光
    d.ellipse([cx-95, 165, cx-35, 235], fill=(255, 255, 255, 90))
    # 叶子冠
    grn = (34, 197, 94, 255); grn_d = (21, 128, 61, 255)
    for ang, ln in [(-0.9, 95), (-0.35, 110), (0.35, 110), (0.9, 95)]:
        import math
        x2 = cx + math.cos(ang) * ln; y2 = 128 - math.sin(ang) * 62
        d.line([cx, 140, x2, y2], fill=grn, width=16)
    d.ellipse([cx-30, 108, cx+30, 152], fill=grn_d)
    return finish(im, "草莓")

# ---------- 蛋糕 ----------
def cake():
    im = canvas(); d = ImageDraw.Draw(im)
    # 托盘
    d.ellipse([60, 400, W-60, 470], fill=(226, 232, 240, 255))
    d.ellipse([80, 392, W-80, 448], fill=(248, 250, 252, 255))
    # 底层蛋糕（粉）
    d.rounded_rectangle([105, 285, W-105, 420], 26, fill=(249, 168, 212, 255))
    # 奶油夹层
    d.rounded_rectangle([105, 258, W-105, 300], 18, fill=(255, 251, 240, 255))
    # 顶层（奶油粉）
    d.rounded_rectangle([105, 190, W-105, 272], 26, fill=(251, 207, 232, 255))
    # 淋面波浪
    for i in range(6):
        x = 105 + i * 62
        d.ellipse([x, 236, x+66, 292], fill=(255, 255, 255, 255))
    d.rounded_rectangle([105, 190, W-105, 240], 26, fill=(255, 255, 255, 255))
    # 樱桃
    d.ellipse([cx0:=W/2-34, 128, W/2+34, 196], fill=(225, 29, 72, 255))
    d.ellipse([W/2-24, 138, W/2+2, 168], fill=(255, 255, 255, 110))
    d.line([W/2, 132, W/2+18, 96], fill=(120, 83, 46, 255), width=10)
    # 糖粒
    for x, y, c in [(150, 330, (251,191,36,255)), (210, 360, (56,189,248,255)), (W-150, 340, (251,191,36,255)), (W-210, 370, (168,85,247,255)), (W/2, 340, (74,222,128,255))]:
        d.ellipse([x-8, y-8, x+8, y+8], fill=c)
    return finish(im, "小蛋糕")

# ---------- 奶瓶 ----------
def bottle():
    im = canvas(); d = ImageDraw.Draw(im)
    cx = W / 2
    # 奶嘴
    d.polygon([(cx-42, 118), (cx+42, 118), (cx, 44)], fill=(240, 222, 190, 255))
    d.ellipse([cx-42, 100, cx+42, 140], fill=(240, 222, 190, 255))
    # 瓶盖环
    d.rounded_rectangle([cx-62, 128, cx+62, 172], 18, fill=(250, 204, 21, 255))
    # 瓶身
    d.rounded_rectangle([cx-88, 160, cx+88, 440], 40, fill=(255, 255, 255, 255))
    # 奶
    d.rounded_rectangle([cx-72, 236, cx+72, 424], 30, fill=(254, 243, 199, 255))
    # 刻度
    for y in (268, 320, 372):
        d.line([cx-56, y, cx-30, y], fill=(148, 163, 184, 255), width=8)
        d.line([cx+30, y, cx+56, y], fill=(148, 163, 184, 255), width=8)
    # 高光
    d.rounded_rectangle([cx-70, 182, cx-48, 400], 12, fill=(255, 255, 255, 200))
    d.line([cx-70, 182, cx-70, 400], fill=(226, 232, 240, 255), width=4)
    return finish(im, "奶瓶")

# ---------- 虫子 ----------
def worm():
    im = canvas(); d = ImageDraw.Draw(im)
    import math
    grn = (74, 222, 128, 255); grn_d = (22, 163, 74, 255)
    pts = [(170 + i * 66, 300 - int(34 * math.sin(i / 4 * math.pi)), 52 - abs(i - 2) * 5) for i in range(5)]
    # 从尾到头画
    for x, y, r in reversed(pts):
        d.ellipse([x-r, y-r, x+r, y+r], fill=grn)
        d.ellipse([x-r+10, y-r+10, x+r-6, y+r-16], fill=(255, 255, 255, 70))
    # 脚
    for x, y, r in pts[:-1]:
        d.line([x, y+r-6, x-6, y+r+26], fill=grn_d, width=10)
        d.line([x+14, y+r-6, x+22, y+r+26], fill=grn_d, width=10)
    # 头（最后一个点）
    hx, hy, hr = pts[-1]
    d.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=grn)
    # 眼睛
    d.ellipse([hx-24, hy-18, hx-2, hy+4], fill=(255, 255, 255, 255))
    d.ellipse([hx+2, hy-18, hx+24, hy+4], fill=(255, 255, 255, 255))
    d.ellipse([hx-18, hy-12, hx-6, hy+0], fill=(15, 23, 42, 255))
    d.ellipse([hx+6, hy-12, hx+18, hy+0], fill=(15, 23, 42, 255))
    # 微笑
    d.arc([hx-16, hy+6, hx+16, hy+34], 20, 160, fill=(15, 23, 42, 255), width=7)
    # 触角
    d.line([hx-14, hy-hr+8, hx-34, hy-hr-34], fill=grn_d, width=9)
    d.line([hx+14, hy-hr+8, hx+34, hy-hr-34], fill=grn_d, width=9)
    d.ellipse([hx-42, hy-hr-44, hx-26, hy-hr-28], fill=grn_d)
    d.ellipse([hx+26, hy-hr-44, hx+42, hy-hr-28], fill=grn_d)
    return finish(im, "小青虫")

# ---------- 葡萄 ----------
def grapes():
    im = canvas(); d = ImageDraw.Draw(im)
    pur = (139, 92, 246, 255); pur_d = (91, 33, 182, 255)
    cx = W / 2
    rows = [(1, 300), (3, 366), (2, 432), (1, 492)]  # (数量, y) 从上到下
    # 简单锥形簇: 3-2-2-1 用固定坐标
    layout = [
        (cx, 246), (cx-78, 308), (cx+78, 308),
        (cx-40, 372), (cx+40, 372), (cx, 430),
    ]
    R = 60
    for x, y in layout:
        d.ellipse([x-R, y-R, x+R, y+R], fill=pur)
        d.ellipse([x-R+12, y-R+12, x+R-26, y+R-30], fill=(255, 255, 255, 60))
    # 底部一颗
    bx, by = cx, 430 + 58
    d.ellipse([bx-R, by-R, bx+R, by+R], fill=pur)
    d.ellipse([bx-R+12, by-R+12, bx+R-26, by+R-30], fill=(255, 255, 255, 60))
    # 暗面衔接线
    for x, y in layout:
        d.arc([x-R+6, y-R+6, x+R-6, y+R-6], 100, 260, fill=pur_d, width=6)
    # 蒂 + 叶
    d.line([cx, 220, cx+6, 160], fill=(120, 83, 46, 255), width=14)
    d.ellipse([cx+2, 108, cx+108, 176], fill=(34, 197, 94, 255))
    d.line([cx+8, 148, cx+96, 130], fill=(21, 128, 61, 255), width=6)
    return finish(im, "葡萄")

foods = [strawberry(), cake(), bottle(), worm(), grapes()]
for f in foods:
    print(f["name"], "b64 chars:", len(f["b64"]))
json.dump(foods, open("/tmp/foods.json", "w"))
print("saved /tmp/foods.json")
