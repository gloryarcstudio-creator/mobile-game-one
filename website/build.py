#!/usr/bin/env python3
"""Build the Protek Games website.

    python3 website/build.py            -> website/dist/  (upload its contents to the site root)
                                           + website/protekgames-site.zip
    python3 website/build.py --preview  -> website/preview/ (relative links, opens from disk)

Pages live in src/pages/ as HTML fragments with a front-matter comment on top.
The game cards on the home page and /games/ come from games.json.
Static files (css, js, fonts, game media) live in public/ and are copied as is.
"""
import html, json, os, re, shutil, sys, time, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://protekgames.com"
PREVIEW = "--preview" in sys.argv
OUT = os.path.join(ROOT, "preview" if PREVIEW else "dist")
VER = time.strftime("%Y%m%d%H%M")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def front_matter(src):
    m = re.match(r"\s*<!--(.*?)-->\s*", src, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip()
    return meta, src[m.end():]


def game_cards(games):
    out = ['<div class="shelf">']
    for g in games:
        chips = [f'<span class="chip {g["status"]}">{g["status_label"]}</span>']
        chips += [f'<span class="chip">{c}</span>' for c in g["chips"]]
        out.append(f'''<a class="game" href="/games/{g["slug"]}/">
  <div class="art"><img src="{g["art"]}" alt="{html.escape(g["name"])}" width="1024" height="500" loading="lazy"></div>
  <div class="body">
    <h3>{g["name"]}</h3>
    <p>{g["tagline"]}</p>
    <div class="chips">{"".join(chips)}</div>
  </div>
</a>''')
    out.append('''<div class="game next" aria-label="Next game">
  <div class="art"><span>?</span></div>
  <div class="body">
    <h3>Next game</h3>
    <p>Already in the sketchbook. Write to info@protekgames.com to hear about it first.</p>
  </div>
</div>''')
    out.append("</div>")
    return "\n".join(out)


def relativize(page_html, url_path):
    """For the preview build: turn /abs links into relative ones and point folders at index.html."""
    depth = url_path.strip("/").count("/") + (1 if url_path.strip("/") and not url_path.endswith(".html") else 0)
    prefix = "../" * depth or "./"

    def fix(m):
        attr, path = m.group(1), m.group(2)
        path, hashpart = (path.split("#", 1) + [""])[:2]
        if path == "" or path.endswith("/"):
            path += "index.html"
        return f'{attr}="{prefix}{path.lstrip("/")}{"#" + hashpart if hashpart else ""}"'

    return re.sub(r'(href|src|poster)="/(?!/)([^"]*)"', fix, page_html)


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, "public"), OUT)
    layout = read(os.path.join(ROOT, "src", "layout.html"))
    games = json.loads(read(os.path.join(ROOT, "games.json")))
    pages_dir = os.path.join(ROOT, "src", "pages")
    urls = []
    for dirpath, _, files in os.walk(pages_dir):
        for name in files:
            if not name.endswith(".html"):
                continue
            meta, body = front_matter(read(os.path.join(dirpath, name)))
            path = meta["path"]
            body = body.replace("{{GAME_CARDS}}", game_cards(games))
            page = layout
            for nav in ("games", "privacy"):
                page = page.replace("{{NAV_%s}}" % nav, ' aria-current="page"' if meta.get("nav") == nav else "")
            page = (page.replace("{{CONTENT}}", body)
                    .replace("{{TITLE}}", html.escape(meta["title"]))
                    .replace("{{DESC}}", html.escape(meta["description"]))
                    .replace("{{CANONICAL}}", SITE + path)
                    .replace("{{OG_IMAGE}}", SITE + meta["og_image"])
                    .replace("{{VER}}", VER))
            if meta.get("noindex"):
                page = page.replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n<meta name="theme-color"')
            else:
                urls.append(path)
            if PREVIEW:
                page = relativize(page, path)
            dest = os.path.join(OUT, path.strip("/"), "index.html") if path.endswith("/") else os.path.join(OUT, path.strip("/"))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8") as f:
                f.write(page)

    today = time.strftime("%Y-%m-%d")
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap += [f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>" for u in sorted(urls)]
    sitemap.append("</urlset>")
    with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
        f.write("\n".join(sitemap) + "\n")
    with open(os.path.join(OUT, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    shutil.copy(os.path.join(ROOT, "app-ads.txt"), os.path.join(OUT, "app-ads.txt"))
    shutil.copy(os.path.join(ROOT, "htaccess"), os.path.join(OUT, ".htaccess"))

    if not PREVIEW:
        zpath = os.path.join(ROOT, "protekgames-site.zip")
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            for dirpath, _, files in os.walk(OUT):
                for name in files:
                    full = os.path.join(dirpath, name)
                    z.write(full, os.path.relpath(full, OUT))
        print("zip:", zpath, round(os.path.getsize(zpath) / 1e6, 1), "MB")
    print("built", len(urls) + 1, "pages into", OUT)


if __name__ == "__main__":
    main()
