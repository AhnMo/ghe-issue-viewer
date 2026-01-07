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




