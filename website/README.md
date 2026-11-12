# protekgames.com

Static site of the studio Protek Games: home, games catalogue, one page per game, privacy policy, app-ads.txt. English only. No frameworks, cookies, analytics or third-party requests.

## Build

```
python3 website/build.py            # -> website/dist/ and website/protekgames-site.zip
python3 website/build.py --preview  # -> website/preview/ with relative links, opens from disk
```

Python 3 only, no packages.

## Upload to FASTPANEL

1. FASTPANEL › Sites › protekgames.com › File manager, open the site's web root (usually `/var/www/<user>/data/www/protekgames.com/`).
2. Upload `protekgames-site.zip` there and choose Extract. `index.html`, `app-ads.txt`, `privacy/` and the rest must sit directly in the web root, not in a subfolder.
3. In the site settings, issue a Let's Encrypt certificate and turn on the redirect to HTTPS.
4. Check: https://protekgames.com/app-ads.txt and https://protekgames.com/privacy/ open.

## Store and AdMob links

- Developer website in Google Play Console and App Store Connect: `https://protekgames.com` (AdMob looks for app-ads.txt there).
- Privacy policy URL: `https://protekgames.com/privacy/` (per game: `#cat-exorcist`).
- Support email: `info@protekgames.com`.
- `app-ads.txt`: once the AdMob account exists, put the line AdMob shows into `website/app-ads.txt`, rebuild and upload.

## Add a new game

1. Media into `public/games/<slug>/media/` (key art 1024×500 as `key.webp`, `icon.webp`, `og.jpg` 1200×630, screenshots, trailer).
2. Copy `src/pages/games/cat-exorcist/index.html` to `src/pages/games/<slug>/index.html` and change the front matter (`path: /games/<slug>/`) and the text.
3. Add an entry to `games.json` (`status`: `dev` or `live`). The card shows up on the home page and on /games/.
4. Add a section for the game to `src/pages/privacy/index.html` if its data use differs.
5. When the game is in stores, replace the "coming soon" badges with real store links.
