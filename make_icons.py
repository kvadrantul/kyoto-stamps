#!/usr/bin/env python3
"""Значки приложения: красная печать с иероглифом 印.

Запуск на macOS: python3 make_icons.py
Переписывает icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png.
"""
from PIL import Image, ImageDraw, ImageFont

SHU = (199, 56, 43, 255)          # --shu, тот же красный, что на карте
WHITE = (255, 255, 255, 255)
FONT = "/System/Library/Fonts/ヒラギノ明朝 ProN.ttc"
GLYPH = "印"                   # 印


def seal(size, radius_ratio, glyph_ratio, bleed=False):
    """Квадрат со скруглением и иероглифом по центру. bleed — фон во всю плитку."""
    ss = 8                          # рисуем крупнее и уменьшаем: края получаются гладкими
    w = size * ss
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bleed:
        d.rectangle([0, 0, w, w], fill=SHU)
    else:
        d.rounded_rectangle([0, 0, w - 1, w - 1], radius=int(w * radius_ratio), fill=SHU)

    px = int(w * glyph_ratio)
    f = ImageFont.truetype(FONT, px)
    box = d.textbbox((0, 0), GLYPH, font=f)
    d.text(((w - (box[2] - box[0])) / 2 - box[0],
            (w - (box[3] - box[1])) / 2 - box[1]), GLYPH, font=f, fill=WHITE)
    return img.resize((size, size), Image.LANCZOS)


def main():
    seal(192, 0.16, 0.62).save("icon-192.png")
    seal(512, 0.16, 0.62).save("icon-512.png")
    # maskable: система сама обрежет углы, поэтому фон во всю плитку,
    # а иероглиф ужат в безопасную зону (80% от края)
    seal(512, 0, 0.46, bleed=True).save("icon-maskable-512.png")
    # iOS сам скругляет углы и не понимает прозрачность — фон во всю плитку
    seal(180, 0, 0.62, bleed=True).save("apple-touch-icon.png")
    print("готово: icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png")


if __name__ == "__main__":
    main()
