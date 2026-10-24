"""Rebuilds every image in public/assets from the three original uploads.
Run:  python3 tools/make_assets.py <logo.png> <brand-collage.png> <banner.png>
(Optional - the finished assets are already in the project.)"""
import sys
from PIL import Image, ImageDraw, ImageOps, ImageFilter
logo_p, collage_p, banner_p = sys.argv[1:4]
A = "public/assets/"

# ---- logo + favicons (circular mask only removes the square corners, never the ring)
logo = Image.open(logo_p).convert("RGB")
def circ(im, size):
    im = im.resize((size, size), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (size*4, size*4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size*4-1, size*4-1), fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    im.putalpha(m); return im
logo.save(A+"logo-original.png", optimize=True)          # untouched master
circ(logo, 512).save(A+"logo.png", optimize=True)         # used on the site
circ(logo, 180).save(A+"apple-touch-icon.png", optimize=True)
circ(logo, 192).save(A+"icon-192.png", optimize=True)
circ(logo, 512).save(A+"icon-512.png", optimize=True)
circ(logo, 48).save(A+"favicon.png", optimize=True)
circ(logo, 256).save("public/favicon.ico", sizes=[(16,16),(32,32),(48,48)])

# ---- brand tiles (collage is a 4x4 grid)
names = ["vole","joola","selkirk","head","franklin","crbn","paddletek","onix",
         "gamma","rokne","diadem","vulcan","six-zero","babolat","adidas","wilka"]
col = Image.open(collage_p).convert("RGB"); W, H = col.size; tw, th = W/4, H/4
for i, n in enumerate(names):
    r, c = divmod(i, 4); inset = 6
    t = col.crop((round(c*tw)+inset, round(r*th)+inset, round((c+1)*tw)-inset, round((r+1)*th)-inset))
    t = t.resize((300, 300), Image.LANCZOS)
    t.save(A+f"brands/{n}.png", optimize=True)

# ---- photo crops from the promo banner (text-free regions only)
ban = Image.open(banner_p).convert("RGB"); s = ban.size[0]/2000
def box(x0,y0,x1,y1): return tuple(round(v*s) for v in (x0,y0,x1,y1))
photo = ban.crop(box(880, 390, 1400, 640))
photo = photo.resize((photo.width*2, photo.height*2), Image.LANCZOS)
photo.save(A+"hero/paddle-balls.jpg", quality=88, optimize=True)
tex = ban.crop(box(800, 0, 1390, 400))
strip = Image.new("RGB", (tex.width*3, tex.height))
flip = ImageOps.mirror(tex)
for k, im in enumerate([tex, flip, tex]): strip.paste(im, (k*tex.width, 0))
strip = strip.filter(ImageFilter.GaussianBlur(1.2))
strip.save(A+"hero/court-texture.jpg", quality=80, optimize=True)
print("assets done", photo.size, strip.size)

# ---- small logo for the navigation bar + social share image
circ(logo, 160).save(A+"logo-sm.png", optimize=True)
from PIL import ImageFont
import glob
def font(name, size):
    for p in glob.glob(f"/usr/share/fonts/**/{name}", recursive=True): return ImageFont.truetype(p, size)
    return ImageFont.load_default()
og = Image.new("RGB", (1200, 630), "#001E16")
bg = strip.resize((1821*630//411, 630)).crop((0,0,1200,630))
og.paste(bg)
ov = Image.new("RGBA", (1200,630), (0,30,22,205)); og = Image.alpha_composite(og.convert("RGBA"), ov)
lg = circ(logo, 440); og.alpha_composite(lg, (70, 95))
d = ImageDraw.Draw(og)
d.text((570, 150), "SMASH CULTURE", font=font("Inter-ExtraBold.otf", 60), fill="#F7F5E9")
d.text((574, 235), "PICKLEBALL CLUB", font=font("Inter-SemiBold.otf", 40), fill="#F7F5E9")
d.rectangle((574, 305, 700, 311), fill="#C7F536")
d.text((574, 340), "SMASH YOUR LIMITS.", font=font("Inter-Bold.otf", 46), fill="#C7F536")
d.text((574, 420), "More rallies. More friends. Same culture.", font=font("Inter-Regular.otf", 30), fill="#DCE5DC")
og.convert("RGB").save(A+"og-image.jpg", quality=88, optimize=True)
