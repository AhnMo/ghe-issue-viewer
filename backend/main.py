import os
import time
import logging
from fastapi import FastAPI, Header, HTTPException, Request
import httpx
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ghe-client")


GHE_HOSTNAME = os.getenv("GHE_HOSTNAME", "ghe.example.com")
BASE_URL = f"https://{GHE_HOSTNAME}/api/v3"

class Comment(BaseModel):
    user_login: str
    body: Optional[str]
    created_at: datetime

class IssueSummary(BaseModel):
    number: int
    title: str
    user_login: str
    state: str
    created_at: datetime
    comments_count: int

class IssueListResponse(BaseModel):
    issues: List[IssueSummary]
    has_more: bool

class IssueDetail(BaseModel):
    number: int
    title: str
    user_login: str
    state: str
    body: Optional[str]
    created_at: datetime
    comments_count: int

class IssueThreadResponse(BaseModel):
    issue: IssueDetail
    comments: List[Comment]


# PR Models
class PRSummary(BaseModel):
    number: int
    title: str
    user_login: str
    state: str
    created_at: datetime
    merged_at: Optional[datetime]
    head_ref: str
    base_ref: str

class PRListResponse(BaseModel):
    pull_requests: List[PRSummary]
    has_more: bool

class PRDetail(BaseModel):
    number: int
    title: str
    user_login: str
    state: str
    body: Optional[str]
    created_at: datetime
    merged_at: Optional[datetime]
    head_ref: str
    base_ref: str
    additions: int
    deletions: int
    changed_files: int
    mergeable: Optional[bool]

class FileDiff(BaseModel):
    filename: str
    status: str  # added, removed, modified, renamed
    additions: int
    deletions: int
    patch: Optional[str]

class PRDetailResponse(BaseModel):
    pull_request: PRDetail
    comments: List[Comment]
    files: List[FileDiff]


app = FastAPI()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log incoming request metadata (skip logging the sensitive token)
    logger.info(f"Incoming: {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    formatted_time = f"{process_time:.2f}ms"
    
    # Log outgoing response status and duration
    logger.info(f"Outgoing: Status {response.status_code} | Duration: {formatted_time}")
    
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For local development. In production, specify the frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/issues/{owner}/{repo}", response_model=IssueListResponse)
async def list_issues(
    owner: str,
    repo: str,
    page: int = 1,
    state: str = "open",
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    per_page = 30
    
    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}/repos/{owner}/{repo}/issues"
        params = {
            "state": state,
            "page": page,
            "per_page": per_page,
            "sort": "created",
            "direction": "desc"
        }
        
        res = await client.get(url, headers=headers, params=params)
        
        if res.status_code != 200:
            logger.error(f"GHE API Error: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch issues")
        
        issues_raw = res.json()
    
    issues = [
        IssueSummary(
            number=issue["number"],
            title=issue["title"],
            user_login=issue["user"]["login"],
            state=issue["state"],
            created_at=issue["created_at"],
            comments_count=issue["comments"]
        )
        for issue in issues_raw
        if "pull_request" not in issue  # Filter out PRs
    ]
    
    return IssueListResponse(issues=issues, has_more=len(issues_raw) == per_page)


@app.get("/api/issues/{owner}/{repo}/{issue_number}", response_model=IssueThreadResponse)
async def get_issue_with_comments(
    owner: str,
    repo: str,
    issue_number: int,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient() as client:
        # Fetch Issue
        issue_url = f"{BASE_URL}/repos/{owner}/{repo}/issues/{issue_number}"
        issue_res = await client.get(issue_url, headers=headers)
        
        if issue_res.status_code != 200:
            logger.error(f"GHE API Error for Issue #{issue_number}: {issue_res.status_code}")
            raise HTTPException(status_code=issue_res.status_code, detail="Issue not found or unauthorized")
        
        issue_raw = issue_res.json()

        # Fetch Comments
        comments_res = await client.get(f"{issue_url}/comments", headers=headers)
        comments_raw = comments_res.json()

    # Map to Pydantic
    issue_data = IssueDetail(
        number=issue_raw["number"],
        title=issue_raw["title"],
        user_login=issue_raw["user"]["login"],
        state=issue_raw["state"],
        body=issue_raw.get("body"),
        created_at=issue_raw["created_at"],
        comments_count=issue_raw["comments"]
    )

    comments_list = [
        Comment(user_login=c["user"]["login"], body=c.get("body"), created_at=c["created_at"])
        for c in comments_raw
    ]

    return IssueThreadResponse(issue=issue_data, comments=comments_list)


# ============ Pull Request Endpoints ============

@app.get("/api/pulls/{owner}/{repo}", response_model=PRListResponse)
async def list_pull_requests(
    owner: str,
    repo: str,
    page: int = 1,
    state: str = "open",
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    per_page = 30
    
    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}/repos/{owner}/{repo}/pulls"
        params = {
            "state": state,
            "page": page,
            "per_page": per_page,
            "sort": "created",
            "direction": "desc"
        }
        
        res = await client.get(url, headers=headers, params=params)
        
        if res.status_code != 200:
            logger.error(f"GHE API Error: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch pull requests")
        
        prs_raw = res.json()
    
    prs = [
        PRSummary(
            number=pr["number"],
            title=pr["title"],
            user_login=pr["user"]["login"],
            state=pr["state"],
            created_at=pr["created_at"],
            merged_at=pr.get("merged_at"),
            head_ref=pr["head"]["ref"],
            base_ref=pr["base"]["ref"]
        )
        for pr in prs_raw
    ]
    
    return PRListResponse(pull_requests=prs, has_more=len(prs_raw) == per_page)


@app.get("/api/pulls/{owner}/{repo}/{pr_number}", response_model=PRDetailResponse)
async def get_pull_request_with_diff(
    owner: str,
    repo: str,
    pr_number: int,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Fetch PR details
        pr_url = f"{BASE_URL}/repos/{owner}/{repo}/pulls/{pr_number}"
        pr_res = await client.get(pr_url, headers=headers)
        
        if pr_res.status_code != 200:
            logger.error(f"GHE API Error for PR #{pr_number}: {pr_res.status_code}")
            raise HTTPException(status_code=pr_res.status_code, detail="PR not found or unauthorized")
        
        pr_raw = pr_res.json()

        # Fetch PR comments (issue comments + review comments)
        comments_res = await client.get(f"{BASE_URL}/repos/{owner}/{repo}/issues/{pr_number}/comments", headers=headers)
        comments_raw = comments_res.json() if comments_res.status_code == 200 else []

        # Fetch PR files (diff)
        files_res = await client.get(f"{pr_url}/files", headers=headers, params={"per_page": 100})
        files_raw = files_res.json() if files_res.status_code == 200 else []

    pr_data = PRDetail(
        number=pr_raw["number"],
        title=pr_raw["title"],
        user_login=pr_raw["user"]["login"],
        state=pr_raw["state"],
        body=pr_raw.get("body"),
        created_at=pr_raw["created_at"],
        merged_at=pr_raw.get("merged_at"),
        head_ref=pr_raw["head"]["ref"],
        base_ref=pr_raw["base"]["ref"],
        additions=pr_raw.get("additions", 0),
        deletions=pr_raw.get("deletions", 0),
        changed_files=pr_raw.get("changed_files", 0),
        mergeable=pr_raw.get("mergeable")
    )

    comments_list = [
        Comment(user_login=c["user"]["login"], body=c.get("body"), created_at=c["created_at"])
        for c in comments_raw
    ]

    files_list = [
        FileDiff(
            filename=f["filename"],
            status=f["status"],
            additions=f["additions"],
            deletions=f["deletions"],
            patch=f.get("patch")
        )
        for f in files_raw
    ]

    return PRDetailResponse(pull_request=pr_data, comments=comments_list, files=files_list)


# ============ Commit Models ============

class CommitSummary(BaseModel):
    sha: str
    short_sha: str
    message: str
    author_login: Optional[str]
    author_name: str
    authored_date: datetime

class CommitListResponse(BaseModel):
    commits: List[CommitSummary]
    has_more: bool

class CommitDetail(BaseModel):
    sha: str
    message: str
    author_login: Optional[str]
    author_name: str
    author_email: str
    authored_date: datetime
    committer_name: str
    committed_date: datetime
    parent_shas: List[str]
    additions: int
    deletions: int
    changed_files: int

class CommitDetailResponse(BaseModel):
    commit: CommitDetail
    files: List[FileDiff]


# ============ Code Browsing Models ============

class RepoInfo(BaseModel):
    default_branch: str
    description: Optional[str]

class TreeEntry(BaseModel):
    name: str
    path: str
    type: str  # "file" or "dir"
    size: Optional[int]
    sha: str

class TreeResponse(BaseModel):
    entries: List[TreeEntry]
    current_path: str
    ref: str

class FileContent(BaseModel):
    name: str
    path: str
    size: int
    content: str
    encoding: str  # "text" or "binary" or "too_large"
    sha: str
    ref: str

class ContentsResponse(BaseModel):
    type: str  # "dir" or "file"
    tree: Optional[TreeResponse]
    file: Optional[FileContent]

class BranchSummary(BaseModel):
    name: str

class BranchListResponse(BaseModel):
    branches: List[BranchSummary]


# ============ Commit Endpoints ============

@app.get("/api/commits/{owner}/{repo}", response_model=CommitListResponse)
async def list_commits(
    owner: str,
    repo: str,
    page: int = 1,
    sha: Optional[str] = None,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    per_page = 30
    params = {"page": page, "per_page": per_page}
    if sha:
        params["sha"] = sha

    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}/repos/{owner}/{repo}/commits"
        res = await client.get(url, headers=headers, params=params)

        if res.status_code != 200:
            logger.error(f"GHE API Error listing commits: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch commits")

        commits_raw = res.json()

    commits = [
        CommitSummary(
            sha=c["sha"],
            short_sha=c["sha"][:7],
            message=c["commit"]["message"],
            author_login=c["author"]["login"] if c.get("author") else None,
            author_name=c["commit"]["author"]["name"],
            authored_date=c["commit"]["author"]["date"]
        )
        for c in commits_raw
    ]

    return CommitListResponse(commits=commits, has_more=len(commits_raw) == per_page)


@app.get("/api/commits/{owner}/{repo}/{ref:path}", response_model=CommitDetailResponse)
async def get_commit(
    owner: str,
    repo: str,
    ref: str,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{BASE_URL}/repos/{owner}/{repo}/commits/{ref}"
        res = await client.get(url, headers=headers, params={"per_page": 100})

        if res.status_code != 200:
            logger.error(f"GHE API Error for commit {ref}: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Commit not found or unauthorized")

        c = res.json()

    commit_data = CommitDetail(
        sha=c["sha"],
        message=c["commit"]["message"],
        author_login=c["author"]["login"] if c.get("author") else None,
        author_name=c["commit"]["author"]["name"],
        author_email=c["commit"]["author"]["email"],
        authored_date=c["commit"]["author"]["date"],
        committer_name=c["commit"]["committer"]["name"],
        committed_date=c["commit"]["committer"]["date"],
        parent_shas=[p["sha"] for p in c.get("parents", [])],
        additions=c.get("stats", {}).get("additions", 0),
        deletions=c.get("stats", {}).get("deletions", 0),
        changed_files=len(c.get("files", []))
    )

    files_list = [
        FileDiff(
            filename=f["filename"],
            status=f["status"],
            additions=f["additions"],
            deletions=f["deletions"],
            patch=f.get("patch")
        )
        for f in c.get("files", [])
    ]

    return CommitDetailResponse(commit=commit_data, files=files_list)


# ============ Code Browsing Endpoints ============

@app.get("/api/repos/{owner}/{repo}", response_model=RepoInfo)
async def get_repo_info(
    owner: str,
    repo: str,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/repos/{owner}/{repo}", headers=headers)

        if res.status_code != 200:
            logger.error(f"GHE API Error for repo info: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch repository info")

        repo_raw = res.json()

    return RepoInfo(
        default_branch=repo_raw["default_branch"],
        description=repo_raw.get("description")
    )


@app.get("/api/repos/{owner}/{repo}/branches", response_model=BranchListResponse)
async def list_branches(
    owner: str,
    repo: str,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{BASE_URL}/repos/{owner}/{repo}/branches",
            headers=headers,
            params={"per_page": 100}
        )

        if res.status_code != 200:
            logger.error(f"GHE API Error listing branches: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch branches")

        branches_raw = res.json()

    return BranchListResponse(
        branches=[BranchSummary(name=b["name"]) for b in branches_raw]
    )


@app.get("/api/repos/{owner}/{repo}/contents", response_model=ContentsResponse)
async def get_contents(
    owner: str,
    repo: str,
    path: str = "",
    ref: Optional[str] = None,
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    import base64

    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    params = {}
    if ref:
        params["ref"] = ref

    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}/repos/{owner}/{repo}/contents/{path}"
        res = await client.get(url, headers=headers, params=params)

        if res.status_code != 200:
            logger.error(f"GHE API Error for contents {path}: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch contents")

        contents_raw = res.json()

    used_ref = ref or ""

    # Directory: GHE returns a list
    if isinstance(contents_raw, list):
        entries = []
        for entry in contents_raw:
            entries.append(TreeEntry(
                name=entry["name"],
                path=entry["path"],
                type="dir" if entry["type"] == "dir" else "file",
                size=entry.get("size") if entry["type"] == "file" else None,
                sha=entry["sha"]
            ))
        # Sort: dirs first (alphabetical), then files (alphabetical)
        entries.sort(key=lambda e: (0 if e.type == "dir" else 1, e.name.lower()))
        return ContentsResponse(
            type="dir",
            tree=TreeResponse(entries=entries, current_path=path, ref=used_ref),
            file=None
        )

    # File: GHE returns a single object
    f = contents_raw
    if f.get("type") != "file":
        raise HTTPException(status_code=400, detail="Unsupported content type")

    encoding = f.get("encoding", "none")
    raw_content = f.get("content", "")

    if not raw_content:
        # File too large (>1MB) — GHE omits content
        decoded = ""
        file_encoding = "too_large"
    elif encoding == "base64":
        try:
            decoded_bytes = base64.b64decode(raw_content)
            decoded = decoded_bytes.decode("utf-8")
            file_encoding = "text"
        except (UnicodeDecodeError, Exception):
            decoded = ""
            file_encoding = "binary"
    else:
        decoded = raw_content
        file_encoding = "text"

    return ContentsResponse(
        type="file",
        tree=None,
        file=FileContent(
            name=f["name"],
            path=f["path"],
            size=f.get("size", 0),
            content=decoded,
            encoding=file_encoding,
            sha=f["sha"],
            ref=used_ref
        )
    )


# ============ User Endpoint ============

class UserInfo(BaseModel):
    login: str
    name: Optional[str]

@app.get("/api/user", response_model=UserInfo)
async def get_authenticated_user(
    authorization: str = Header(..., description="GitHub PAT (e.g., 'Bearer <token>')")
):
    headers = {
        "Authorization": authorization,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/user", headers=headers)
        
        if res.status_code != 200:
            logger.error(f"GHE API Error for user: {res.status_code}")
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch user info")
        
        user_raw = res.json()

    return UserInfo(
        login=user_raw["login"],
        name=user_raw.get("name")
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)




