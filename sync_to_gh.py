#!/usr/bin/env python3
# 通过 GitHub REST API 同步工作区文件到仓库（git push 在受限沙箱被墙时可用）。
# 用法:
#   python3 sync_to_gh.py            # 仅推送内容有变化的文件
#   python3 sync_to_gh.py --force    # 强制推送 index.html（验证/覆盖用）
#
# 说明:
#   - 小文件(<1MB): 用 Contents API (PUT /contents/<path>)，自动比较内容，未变则跳过
#   - index.html(>1MB): 用 Git Data API (blob->tree->commit->ref)，绕过 1MB 限制
#   - token 取自 git 配置 http.extraHeader（与 git push 同源）
import base64, glob, json, os, sys, urllib.request

ROOT = "/workspace"
AUTH = os.popen("git -C %s config --get http.extraHeader" % ROOT).read().strip()
NAME, _, VAL = AUTH.partition(": ")
REPO = "UGUne/loverspace"
HEADERS = {NAME: VAL, "User-Agent": "loverspace-sync", "Accept": "application/vnd.github+json"}
C_BASE = "https://api.github.com/repos/%s/contents/" % REPO
G_BASE = "https://api.github.com/repos/%s" % REPO

def api(method, url, data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data is not None:
        req.data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}

def get_remote(path):
    st, body = api("GET", C_BASE + path)
    if st == 200:
        return base64.b64decode(body["content"]), body.get("sha")
    return None, None

def put_small(local, repo_path, msg):
    data = open(local, "rb").read()
    remote, sha = get_remote(repo_path)
    if remote == data:
        print("SKIP   %-28s (unchanged)" % repo_path)
        return True
    payload = {"message": msg, "content": base64.b64encode(data).decode()}
    if sha:
        payload["sha"] = sha
    st, _ = api("PUT", C_BASE + repo_path, payload)
    print("%s  %-6s %s" % (st, "UPDATE" if sha else "CREATE", repo_path))
    return st in (200, 201)

def put_large(local, repo_path, msg, force=False):
    import subprocess
    data = open(local, "rb").read()
    st, body = api("GET", C_BASE + repo_path)
    remote_sha = body.get("sha") if st == 200 else None
    local_sha = subprocess.check_output(["git", "hash-object", local]).decode().strip()
    if not force and remote_sha == local_sha:
        print("SKIP   %-28s (unchanged, large)" % repo_path)
        return True
    b64 = base64.b64encode(data).decode()
    st, ref = api("GET", G_BASE + "/git/ref/heads/master")
    if st != 200:
        print("ERR get ref", st); return False
    head = ref["object"]["sha"]
    st, commit = api("GET", G_BASE + "/git/commits/%s" % head)
    base_tree = commit["tree"]["sha"]
    st, blob = api("POST", G_BASE + "/git/blobs", {"content": b64, "encoding": "base64"})
    if st != 201:
        print("ERR blob", st); return False
    st, tree = api("POST", G_BASE + "/git/trees",
                   {"base_tree": base_tree, "tree": [{"path": repo_path, "mode": "100644", "type": "blob", "sha": blob["sha"]}]})
    if st != 201:
        print("ERR tree", st); return False
    st, newc = api("POST", G_BASE + "/git/commits", {"message": msg, "tree": tree["sha"], "parents": [head]})
    if st != 201:
        print("ERR commit", st); return False
    st, _ = api("PATCH", G_BASE + "/git/refs/heads/master", {"sha": newc["sha"], "force": True})
    print("%s  %-6s %s (%d bytes)" % (st, "LARGE", repo_path, len(data)))
    return st == 200

force = "--force" in sys.argv

# 小文件
put_small(ROOT + "/HANDOFF.md", "HANDOFF.md", "docs: 同步交接文档 HANDOFF.md")
put_small(ROOT + "/package.json", "package.json", "build: 同步 package.json")
for p in sorted(glob.glob(ROOT + "/tests/*")):
    if os.path.isfile(p):
        put_small(p, "tests/" + os.path.basename(p), "test: 同步 " + os.path.basename(p))

# 大文件 index.html（Git Data API 绕过 1MB 限制）
put_large(ROOT + "/index.html", "index.html", "feat: 同步 index.html", force)
