import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from huggingface_hub import snapshot_download

MODEL_ID = "moonshotai/Kimi-K3"
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "models-cache")
MODEL_DIR = Path(CACHE_DIR) / MODEL_ID


def write_model_manifest(model_dir: Path, model_id: str) -> None:
    files = []
    for path in sorted(model_dir.rglob("*")):
        if not path.is_file() or path.name == "model-manifest.json":
            continue
        rel = path.relative_to(model_dir).as_posix()
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        files.append({"path": rel, "size": path.stat().st_size, "sha256": digest})

    manifest = {
        "model_name": model_id,
        "provider": "huggingface",
        "format": "huggingface",
        "version": "main",
        "source": f"https://huggingface.co/{model_id}",
        "files": files,
    }
    (model_dir / "model-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def fetch_jfrog_model_info(jf_url: str, hf_repo: str, model_id: str, model_dir: Path, token: str) -> None:
    """Best-effort: copy Artifactory's own .jfrog_huggingface_model_info.json
    for this model out of the HF remote's cache repo, so Xray/AI Catalog can
    tie the files baked into this image back to the cataloged package."""
    cache_repo = hf_repo if hf_repo.endswith("-cache") else f"{hf_repo}-cache"
    org, name = model_id.split("/", 1) if "/" in model_id else ("", model_id)
    base = f"{jf_url}/artifactory/api/storage/{cache_repo}/models/{org}/{name}"

    def get_json(url):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())

    try:
        listing = get_json(f"{base}?list&deep=1&listFolders=1")
    except Exception as exc:
        print(f"Note: could not list HF cache for model-info ({exc})")
        return

    info_uris = [
        f["uri"]
        for f in listing.get("files", [])
        if not f.get("folder") and str(f.get("uri", "")).endswith(".jfrog_huggingface_model_info.json")
    ]
    if not info_uris:
        print("Note: no .jfrog_huggingface_model_info.json found in cache yet (scan may still be running)")
        return

    rel = info_uris[0].lstrip("/")
    download_url = f"{jf_url}/artifactory/{cache_repo}/models/{org}/{name}/{rel}"
    out = model_dir / ".jfrog_huggingface_model_info.json"
    try:
        req = urllib.request.Request(download_url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            out.write_bytes(resp.read())
        print(f"Added Artifactory HF manifest: {out.name} ({out.stat().st_size} bytes)")
    except urllib.error.HTTPError as exc:
        print(f"Note: could not download model-info ({exc})")


def main():
    token = os.environ.get("HF_TOKEN") or None

    print(f"Downloading {MODEL_ID} into {MODEL_DIR}")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(repo_id=MODEL_ID, local_dir=str(MODEL_DIR), token=token)

    jf_url = os.environ.get("JF_URL")
    hf_repo = os.environ.get("HF_REPO")
    if jf_url and hf_repo and token:
        fetch_jfrog_model_info(jf_url, hf_repo, MODEL_ID, MODEL_DIR, token)

    write_model_manifest(MODEL_DIR, MODEL_ID)
    print("Model cached.")


if __name__ == "__main__":
    main()
