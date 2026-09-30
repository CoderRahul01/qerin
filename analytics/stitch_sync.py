import json
import os
import time
import urllib.request

STITCH_URL = "https://stitch.googleapis.com/mcp"
HEADERS = {
    "X-Goog-Api-Key": os.environ.get("STITCH_API_KEY", ""),
    "Content-Type": "application/json",
}

PROJECT_ID = "7087913385106986199"

def rpc(method, params):
    req = urllib.request.Request(
        STITCH_URL,
        data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8"),
        headers=HEADERS,
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def poll_and_download():
    print(f"Polling Stitch project {PROJECT_ID} for generated screens...")
    out_dir = "/Volumes/Powerhouse/Web3/qerin/analytics/stitch_assets"
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(f"{out_dir}/screenshots", exist_ok=True)
    os.makedirs(f"{out_dir}/code", exist_ok=True)

    for attempt in range(20):
        res = rpc("tools/call", {
            "name": "list_screens",
            "arguments": {"projectId": PROJECT_ID}
        })
        text_content = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
        data = json.loads(text_content)
        screens = data.get("screens", [])
        if screens:
            print(f"Found {len(screens)} screens!")
            for s in screens:
                screen_id = s.get("name", "").split("/")[-1]
                title = s.get("title", screen_id).replace(" ", "_").replace("/", "_")
                print(f"Screen: {title} ({screen_id})")

                # Get detailed screen info
                screen_detail_res = rpc("tools/call", {
                    "name": "get_screen",
                    "arguments": {
                        "projectId": PROJECT_ID,
                        "screenId": screen_id
                    }
                })
                detail_text = screen_detail_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
                detail = json.loads(detail_text)

                # Save metadata
                with open(f"{out_dir}/{screen_id}_meta.json", "w") as mf:
                    json.dump(detail, mf, indent=2)

                # Download screenshot if present
                ss_url = detail.get("screenshot", {}).get("downloadUrl")
                if ss_url:
                    try:
                        s_req = urllib.request.Request(ss_url, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(s_req) as s_resp, open(f"{out_dir}/screenshots/{screen_id}.png", "wb") as out_img:
                            out_img.write(s_resp.read())
                        print(f"Saved screenshot: {out_dir}/screenshots/{screen_id}.png")
                    except Exception as e:
                        print("Could not download screenshot:", e)

                # Download HTML code if present
                html_url = detail.get("htmlCode", {}).get("downloadUrl")
                if html_url:
                    try:
                        h_req = urllib.request.Request(html_url, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(h_req) as h_resp, open(f"{out_dir}/code/{screen_id}.html", "wb") as out_code:
                            out_code.write(h_resp.read())
                        print(f"Saved HTML code: {out_dir}/code/{screen_id}.html")
                    except Exception as e:
                        print("Could not download HTML:", e)
            return True
        print(f"Attempt {attempt+1}/20: Waiting 10s for screen generation to finish...")
        time.sleep(10)
    return False

if __name__ == "__main__":
    poll_and_download()
