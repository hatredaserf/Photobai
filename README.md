# Booth

A free online photo booth. Take four photos with a countdown, pick a filter and a strip color, and download the result as a PNG photo strip.

Everything runs in the browser with plain HTML, CSS and JavaScript. No build step, no dependencies, and no photos are uploaded anywhere.

## Files

- `index.html`: page structure
- `style.css`: layout and styling
- `script.js`: camera access, countdown, filters, and strip download

## Run it locally

Browsers only allow camera access on `https://` pages or on `localhost`, so opening `index.html` by double-clicking may not work. Start a local server instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Put it on GitHub Pages

1. Create a new repository on GitHub.
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the root of the repository.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose the `main` branch and the `/ (root)` folder, then save.
5. After a minute, your site is live at `https://<your-username>.github.io/<repository-name>/`.

GitHub Pages serves over https, so the camera works there.

## Customize

- **Number of photos:** change `SHOTS` at the top of `script.js` and add or remove `.slot` blocks in `index.html`.
- **Strip colors:** edit `PAPERS` in `script.js` and the matching swatches in `index.html`.
- **Countdown length:** change the `3` in the `for (let n = 3; ...)` loop in `runSession()`.
- **Colors and fonts:** edit the variables at the top of `style.css`.
