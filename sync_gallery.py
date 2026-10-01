#!/usr/bin/env python3
"""Sync the photo gallery from a public Google Drive folder.

Lists the folder's image files via the Google Drive API, downloads any
that are new or changed, saves resized thumbnail/full-size JPEGs under
gallery/thumbs/ and gallery/full/, and writes gallery.json describing
them. The website then just serves these as ordinary local static
files — no runtime dependency on Google and no API key anywhere near
the browser.

(An earlier version linked directly to Google's lh3.googleusercontent.com/
drive.google.com/thumbnail image-serving shortcuts instead of downloading
the files. Those only worked for files shared individually — not for
files that are merely inside a publicly-shared folder, which is the
normal case here — so most photos silently failed to load. Downloading
the actual bytes via the authenticated Drive API sidesteps that.)

This is meant to run inside .github/workflows/sync-gallery.yml, where
GOOGLE_DRIVE_API_KEY is a GitHub Actions secret (never exposed to the
site itself) and GALLERY_FOLDER_ID is read from gallery.json unless
overridden.

Usage:
    GOOGLE_DRIVE_API_KEY=... python sync_gallery.py [folder_id]
"""
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).parent
GALLERY_JSON = ROOT / "gallery.json"
THUMBS_DIR = ROOT / "gallery" / "thumbs"
FULL_DIR = ROOT / "gallery" / "full"
DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files"

THUMB_MAX_DIM = 480
FULL_MAX_DIM = 1600
JPEG_QUALITY = 82


def list_images(folder_id, api_key):
    files = []
    page_token = None
    query = f"'{folder_id}' in parents and mimeType contains 'image/' and trashed = false"
    while True:
        params = {
            "q": query,
            "key": api_key,
            "fields": "nextPageToken, files(id,name,modifiedTime)",
            "orderBy": "name",
            "pageSize": 1000,
        }
        if page_token:
            params["pageToken"] = page_token
        url = DRIVE_API_URL + "?" + urllib.parse.urlencode(params)
        try:
            with urllib.request.urlopen(url) as resp:
                data = json.load(resp)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise SystemExit(f"Drive API request failed ({e.code}): {body}")
        files.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return files


def download_file(file_id, api_key):
    url = f"{DRIVE_API_URL}/{file_id}?alt=media&key={api_key}"
    try:
        with urllib.request.urlopen(url) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Failed to download file {file_id} ({e.code}): {body}")


def save_resized(raw_bytes, path, max_dim):
    img = Image.open(io.BytesIO(raw_bytes))
    img = ImageOps.exif_transpose(img)  # phone photos are often stored pre-rotation
    img = img.convert("RGB")
    img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return img.size


def main():
    api_key = os.environ.get("GOOGLE_DRIVE_API_KEY")
    if not api_key:
        raise SystemExit("GOOGLE_DRIVE_API_KEY is not set")

    existing = json.loads(GALLERY_JSON.read_text(encoding="utf-8")) if GALLERY_JSON.exists() else {}
    existing_photos = {p["id"]: p for p in existing.get("photos", [])}

    folder_id = (
        os.environ.get("GALLERY_FOLDER_ID")
        or (sys.argv[1] if len(sys.argv) > 1 else None)
        or existing.get("folderId")
    )
    if not folder_id:
        raise SystemExit("No folder id: set GALLERY_FOLDER_ID, pass it as an argument, or set 'folderId' in gallery.json")

    files = list_images(folder_id, api_key)
    photos = []
    seen_ids = set()

    for f in files:
        file_id = f["id"]
        seen_ids.add(file_id)
        modified = f.get("modifiedTime")
        prev = existing_photos.get(file_id)
        thumb_path = THUMBS_DIR / f"{file_id}.jpg"
        full_path = FULL_DIR / f"{file_id}.jpg"

        needs_download = (
            not prev
            or prev.get("modifiedTime") != modified
            or not thumb_path.exists()
            or not full_path.exists()
        )

        if needs_download:
            print(f"Downloading {f.get('name')} ({file_id})...")
            raw_bytes = download_file(file_id, api_key)
            save_resized(raw_bytes, thumb_path, THUMB_MAX_DIM)
            width, height = save_resized(raw_bytes, full_path, FULL_MAX_DIM)
        else:
            width, height = prev.get("width"), prev.get("height")

        photos.append({
            "id": file_id,
            "name": f.get("name", ""),
            "modifiedTime": modified,
            "width": width,
            "height": height,
            "thumb": f"gallery/thumbs/{file_id}.jpg",
            "full": f"gallery/full/{file_id}.jpg",
        })

    # Clean up files for photos that have been removed from the Drive folder.
    for old_id in set(existing_photos) - seen_ids:
        (THUMBS_DIR / f"{old_id}.jpg").unlink(missing_ok=True)
        (FULL_DIR / f"{old_id}.jpg").unlink(missing_ok=True)

    data = {
        "_readme": existing.get("_readme") or (
            "Auto-generated by .github/workflows/sync-gallery.yml from the public Google Drive "
            "folder linked in the Gallery section of index.html. Do not edit by hand — it gets "
            "overwritten on the next sync. To add/remove photos, just add/remove them in the "
            "Drive folder, then either wait for the next scheduled sync or run the 'Sync photo "
            "gallery' workflow manually from the Actions tab."
        ),
        "folderId": folder_id,
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "photos": photos,
    }
    GALLERY_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(photos)} photo(s) to {GALLERY_JSON}")


if __name__ == "__main__":
    main()
