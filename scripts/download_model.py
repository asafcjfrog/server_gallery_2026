import os

from huggingface_hub import snapshot_download

MODEL_ID = "moonshotai/Kimi-K3"
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "models-cache")


def main():
    print(f"Downloading {MODEL_ID} into {CACHE_DIR}")
    snapshot_download(repo_id=MODEL_ID, cache_dir=CACHE_DIR, token=os.environ.get("HF_TOKEN") or None)
    print("Model cached.")


if __name__ == "__main__":
    main()
