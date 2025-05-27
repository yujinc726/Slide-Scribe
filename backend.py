from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
import json
import shutil
import re
from datetime import datetime
from pathlib import Path
from functools import lru_cache
import hashlib
import uuid
from tempfile import NamedTemporaryFile
import base64
import requests
from dotenv import load_dotenv
import httpx

# .env 파일 로드
load_dotenv()

app = FastAPI(
    title="Slide Scribe",
    description="Modern slide timing and transcription tool",
    version="2.0.0"
)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="static")

# Data directory
DATA_DIR = Path("data")
LECTURES_DIR = DATA_DIR / "lectures"
UPLOADS_DIR = DATA_DIR / "uploads"
LECTURES_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Users file
USERS_FILE = DATA_DIR / "users.json"

# SRT parsing utilities
_TIME_RE = re.compile(r"(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2})[.,](?P<ms>\d{3})")

# 임시 SRT 파일 저장을 위한 딕셔너리
temp_srt_files = {}

# GitHub 설정
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "yujinc726/Slide-Scribe_data")
GITHUB_API_BASE = "https://api.github.com"

if GITHUB_TOKEN:
    print(f"GitHub 레포지토리: {GITHUB_REPO}")
    print("GitHub 토큰이 설정되었습니다.")
else:
    print("⚠️  GitHub 토큰이 설정되지 않았습니다. 환경변수 GITHUB_TOKEN을 설정해주세요.")
    print("   사용자 데이터는 로컬 백업으로만 저장됩니다.")

@lru_cache(maxsize=4096)
def parse_srt_time(time_str: str) -> float:
    """Convert `HH:MM:SS,mmm` or `HH:MM:SS.mmm` to seconds (float)."""
    m = _TIME_RE.match(time_str)
    if not m:
        raise ValueError(f"Invalid time format: {time_str}. Expected HH:MM:SS,mmm")
    h = int(m.group("h"))
    mnt = int(m.group("m")) 
    s = int(m.group("s"))
    ms = int(m.group("ms"))
    return h * 3600 + mnt * 60 + s + ms / 1000.0

def parse_srt_content(srt_content: str) -> List[Dict]:
    """Parse SRT file content and return subtitle data."""
    subtitles = []
    blocks = srt_content.strip().split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        index = lines[0]
        time_range = lines[1]
        text = ' '.join(lines[2:]).replace('\n', ' ')
        
        try:
            match = re.match(r"(\d{2}:\d{2}:\d{2}[.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[.,]\d{3})", time_range)
            if match:
                start_time, end_time = match.groups()
                subtitles.append({
                    'index': index,
                    'start_time': parse_srt_time(start_time),
                    'end_time': parse_srt_time(end_time),
                    'text': text
                })
        except (re.error, ValueError):
            continue
    
    return subtitles

def process_srt_with_timer(srt_content: str, timer_records: List[Dict]) -> List[Dict]:
    """Process SRT content with timer records to create slide-text mapping."""
    subtitles = parse_srt_content(srt_content)
    output_data = []
    
    # Sort subtitles by start time
    subtitles.sort(key=lambda x: x['start_time'])
    
    sub_idx = 0
    n_subs = len(subtitles)
    
    for record in timer_records:
        slide_title = record.get('slide_title', '')
        slide_num = record.get('slide_number', '')
        start_time = parse_srt_time(record.get('start_time', '00:00:00.000'))
        end_time = parse_srt_time(record.get('end_time', '00:00:00.000'))
        notes = record.get('notes', '')
        
        # Skip subtitles before current slide
        while sub_idx < n_subs and subtitles[sub_idx]['end_time'] < start_time:
            sub_idx += 1
        
        # Collect subtitles within current slide time range
        j = sub_idx
        texts = []
        while j < n_subs and subtitles[j]['start_time'] <= end_time:
            if subtitles[j]['end_time'] <= end_time:
                texts.append(subtitles[j]['text'])
            j += 1
        
        if texts:
            output_data.append({
                'slide_title': slide_title,
                'slide_number': slide_num,
                'notes': notes,
                'text': ' '.join(texts),
                'start_time': record.get('start_time'),
                'end_time': record.get('end_time')
            })
    
    return output_data

# Pydantic models
class SlideRecord(BaseModel):
    slide_title: str
    slide_number: str
    start_time: str
    end_time: str
    notes: str

class TimerSession(BaseModel):
    lecture_name: str
    records: List[SlideRecord]
    created_at: str
    updated_at: str

class LectureCreate(BaseModel):
    name: str

# User Models
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    username: str
    password_hash: str
    created_at: str

# User-specific Data Management APIs
class UserLectureCreate(BaseModel):
    name: str

# Timer Record File Management
def get_user_records_dir(username: str, lecture_id: str) -> Path:
    """사용자의 특정 강의 타이머 기록 디렉토리 경로를 반환합니다."""
    user_dir = get_user_data_dir(username)
    return user_dir / "records" / lecture_id

def ensure_user_records_dir(username: str, lecture_id: str) -> Path:
    """사용자의 특정 강의 타이머 기록 디렉토리를 생성하고 경로를 반환합니다."""
    records_dir = get_user_records_dir(username, lecture_id)
    records_dir.mkdir(parents=True, exist_ok=True)
    return records_dir

async def save_timer_record_file(username: str, lecture_id: str, record_id: str, record_data: Dict, friendly_filename: str = None) -> bool:
    """타이머 기록을 독립된 JSON 파일로 GitHub에 저장합니다."""
    try:
        # 기본 파일명은 record_id.json
        filename = f"{record_id}.json"
        
        # 사용자 친화적인 파일명이 제공된 경우 사용
        if friendly_filename:
            # 파일명에 .json 확장자가 없으면 추가
            if not friendly_filename.endswith('.json'):
                filename = f"{friendly_filename}.json"
            else:
                filename = friendly_filename
        
        # 강의명 가져오기 - 기록 데이터에서 확인
        lecture_name = record_data.get("lecture_name", "")
        
        # 강의명이 있으면 ID 대신 사용
        folder_name = lecture_name if lecture_name else lecture_id
        
        # 폴더명에 사용할 수 없는 문자 처리
        safe_folder_name = folder_name.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
        
        # GitHub에 저장할 경로 (강의명 사용)
        file_path = f"users/{username}/records/{safe_folder_name}/{filename}"
        github_success = await save_github_file_content(file_path, record_data, f"Save timer record {record_id}")
        
        # 로컬 백업 (기존 경로 유지)
        records_dir = ensure_user_records_dir(username, lecture_id)
        record_file = records_dir / filename
        with open(record_file, 'w', encoding='utf-8') as f:
            json.dump(record_data, f, ensure_ascii=False, indent=2)
        
        return github_success
    except Exception as e:
        print(f"타이머 기록 파일 저장 오류: {e}")
        return False

async def load_timer_record_file(username: str, lecture_id: str, record_id: str) -> Optional[Dict]:
    """GitHub에서 특정 타이머 기록 파일을 로드합니다."""
    try:
        # 강의명 조회 시도
        lecture_data = None
        lectures_data = await load_user_data_from_github(username, "lectures")
        if lectures_data and "lectures" in lectures_data:
            for lecture in lectures_data["lectures"]:
                if lecture.get("id") == lecture_id:
                    lecture_data = lecture
                    break
        
        # 강의명이 있으면 사용
        lecture_name = lecture_data.get("name", "") if lecture_data else ""
        
        # 강의명에서 사용할 수 없는 문자 처리
        safe_lecture_name = lecture_name.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
        
        # 먼저 강의명 기반 경로로 시도
        if lecture_name:
            lecture_path = f"users/{username}/records/{safe_lecture_name}/{record_id}.json"
            github_data = await get_github_file_content(lecture_path)
            if github_data:
                return github_data
        
        # 강의 ID 기반 경로로 시도
        id_path = f"users/{username}/records/{lecture_id}/{record_id}.json"
        github_data = await get_github_file_content(id_path)
        
        if github_data:
            return github_data
        
        # 로컬 백업에서 시도
        records_dir = get_user_records_dir(username, lecture_id)
        record_file = records_dir / f"{record_id}.json"
        if record_file.exists():
            with open(record_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return None
    except Exception as e:
        print(f"타이머 기록 파일 로드 오류: {e}")
        return None

async def list_timer_records(username: str, lecture_id: str) -> List[Dict]:
    """특정 강의의 모든 타이머 기록 목록을 반환합니다."""
    try:
        records = []
        
        # 강의명 조회 시도
        lecture_data = None
        lectures_data = await load_user_data_from_github(username, "lectures")
        if lectures_data and "lectures" in lectures_data:
            for lecture in lectures_data["lectures"]:
                if lecture.get("id") == lecture_id:
                    lecture_data = lecture
                    break
        
        # 강의명이 있으면 사용
        lecture_name = lecture_data.get("name", "") if lecture_data else ""
        
        # 강의명에서 사용할 수 없는 문자 처리
        safe_lecture_name = lecture_name.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
        
        # GitHub에서 파일 목록 가져오기 시도 - 강의명 기반 경로
        github_files = []
        if lecture_name:
            name_path = f"users/{username}/records/{safe_lecture_name}"
            name_files = await get_github_directory_contents(name_path)
            if name_files:
                github_files.extend(name_files)
        
        # GitHub에서 파일 목록 가져오기 시도 - ID 기반 경로
        id_path = f"users/{username}/records/{lecture_id}"
        id_files = await get_github_directory_contents(id_path)
        if id_files:
            # ID 기반 경로에서 찾은 파일들 중 강의명 기반 경로에서 이미 찾은 파일은 제외
            for file in id_files:
                if file not in github_files:
                    github_files.append(file)
        
        if github_files:
            # GitHub에서 각 파일의 메타데이터 가져오기
            for file_name in github_files:
                if file_name.endswith('.json'):
                    record_id = file_name[:-5]  # .json 확장자 제거
                    record_data = await load_timer_record_file(username, lecture_id, record_id)
                    if record_data:
                        # 이미 추가된 ID인지 확인
                        existing_ids = [r["id"] for r in records]
                        if record_data.get("id") not in existing_ids:
                            records.append({
                                "id": record_data.get("id", record_id),
                                "session_name": record_data.get("session_name", ""),
                                "created_at": record_data.get("created_at", ""),
                                "updated_at": record_data.get("updated_at", ""),
                                "records_count": len(record_data.get("records", []))
                            })
        else:
            # GitHub에서 실패하면 로컬 백업 사용
            records_dir = get_user_records_dir(username, lecture_id)
            
            if records_dir.exists():
                for record_file in records_dir.glob("*.json"):
                    try:
                        with open(record_file, 'r', encoding='utf-8') as f:
                            record_data = json.load(f)
                            # 이미 추가된 ID인지 확인
                            existing_ids = [r["id"] for r in records]
                            if record_data.get("id") not in existing_ids:
                                records.append({
                                    "id": record_data.get("id", record_file.stem),
                                    "session_name": record_data.get("session_name", ""),
                                    "created_at": record_data.get("created_at", ""),
                                    "updated_at": record_data.get("updated_at", ""),
                                    "records_count": len(record_data.get("records", []))
                                })
                    except Exception as e:
                        print(f"타이머 기록 파일 읽기 오류 {record_file}: {e}")
                        continue
        
        return sorted(records, key=lambda x: x.get("created_at", ""), reverse=True)
    except Exception as e:
        print(f"타이머 기록 목록 로드 오류: {e}")
        return []

async def delete_timer_record_file(username: str, lecture_id: str, record_id: str) -> bool:
    """특정 타이머 기록 파일을 삭제합니다."""
    try:
        # GitHub에서 삭제 (GitHub API의 파일 삭제는 복잡하므로 로컬만 삭제)
        records_dir = get_user_records_dir(username, lecture_id)
        record_file = records_dir / f"{record_id}.json"
        
        if record_file.exists():
            record_file.unlink()
            return True
        
        return False
    except Exception as e:
        print(f"타이머 기록 파일 삭제 오류: {e}")
        return False

async def delete_all_lecture_records(username: str, lecture_id: str) -> bool:
    """특정 강의의 모든 타이머 기록 파일을 삭제합니다."""
    try:
        records_dir = get_user_records_dir(username, lecture_id)
        if records_dir.exists():
            shutil.rmtree(records_dir)
        return True
    except Exception as e:
        print(f"강의 타이머 기록 삭제 오류: {e}")
        return False

# Helper functions
def get_lecture_dir(lecture_name: str) -> Path:
    """Get the directory path for a lecture"""
    return LECTURES_DIR / lecture_name

def ensure_lecture_dir(lecture_name: str) -> Path:
    """Ensure lecture directory exists and return path"""
    lecture_dir = get_lecture_dir(lecture_name)
    lecture_dir.mkdir(parents=True, exist_ok=True)
    return lecture_dir

def get_lectures_list() -> List[str]:
    """Get list of all lectures"""
    if not LECTURES_DIR.exists():
        return []
    return [d.name for d in LECTURES_DIR.iterdir() if d.is_dir()]

def get_record_files(lecture_name: str) -> List[str]:
    """Get list of record files for a lecture"""
    lecture_dir = get_lecture_dir(lecture_name)
    if not lecture_dir.exists():
        return []
    return [f.name for f in lecture_dir.glob("*.json")]

def generate_filename() -> str:
    """Generate filename with current timestamp"""
    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    timestamp = now.strftime("%H%M%S")
    return f"{date}_{timestamp}.json"

def hash_password(password: str) -> str:
    """비밀번호를 해시화합니다."""
    return hashlib.sha256(password.encode()).hexdigest()

def get_github_headers():
    """GitHub API용 헤더 반환"""
    if not GITHUB_TOKEN:
        return None
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
    }

async def get_github_file_content(file_path: str) -> Optional[Dict]:
    """GitHub에서 파일 내용을 가져옵니다."""
    headers = get_github_headers()
    if not headers:
        return None
        
    try:
        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/contents/{file_path}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 404:
                return {}  # 파일이 없으면 빈 딕셔너리 반환
            
            if response.status_code != 200:
                print(f"GitHub API 오류: {response.status_code}")
                return None
                
            data = response.json()
            content = base64.b64decode(data['content']).decode('utf-8')
            return json.loads(content)
            
    except Exception as e:
        print(f"GitHub에서 파일 읽기 실패 ({file_path}): {e}")
        return None

async def save_github_file_content(file_path: str, content: Dict, message: str = "Update file") -> bool:
    """GitHub에 파일 내용을 저장합니다."""
    headers = get_github_headers()
    if not headers:
        return False
        
    try:
        # 먼저 기존 파일이 있는지 확인하여 SHA를 가져옵니다.
        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/contents/{file_path}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            sha = None
            if response.status_code == 200:
                sha = response.json()['sha']
            
            # 파일 내용을 JSON 문자열로 변환하고 Base64 인코딩
            content_str = json.dumps(content, ensure_ascii=False, indent=2)
            content_b64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
            
            # 파일 업데이트/생성 요청
            data = {
                "message": message,
                "content": content_b64
            }
            
            if sha:
                data["sha"] = sha
            
            put_response = await client.put(url, headers=headers, json=data)
            
            if put_response.status_code in [200, 201]:
                print(f"GitHub에 파일 저장 성공: {file_path}")
                return True
            else:
                print(f"GitHub 파일 저장 실패: {put_response.status_code}")
                return False
                
    except Exception as e:
        print(f"GitHub 파일 저장 오류: {e}")
        return False

async def load_users_from_github() -> Dict[str, User]:
    """GitHub에서 사용자 정보를 로드합니다. 실패시 로컬 백업 사용."""
    # 먼저 GitHub에서 시도
    github_data = await get_github_file_content("users.json")
    
    if github_data is not None:
        try:
            # get_github_file_content가 이제 직접 파싱된 JSON을 반환함
            users_data = github_data if github_data else {}
            users = {username: User(**user_data) for username, user_data in users_data.items()}
            
            # 로컬에 백업 저장
            await save_local_backup("users.json", users_data)
            print("GitHub에서 사용자 데이터 로드 성공")
            return users
            
        except Exception as e:
            print(f"GitHub 사용자 데이터 파싱 오류: {e}")
    
    # GitHub 실패시 로컬 백업 사용
    print("GitHub에서 로드 실패, 로컬 백업 사용 시도")
    return await load_users_from_local_backup()

async def save_users_to_github(users: Dict[str, User]) -> bool:
    """사용자 정보를 GitHub에 저장합니다. 실패시 로컬에만 저장."""
    users_data = {username: user.dict() for username, user in users.items()}
    
    # GitHub에 저장 시도
    github_success = await save_github_file_content("users.json", users_data, "Update users data")
    
    # 로컬 백업은 항상 저장
    local_success = await save_local_backup("users.json", users_data)
    
    if github_success:
        print("GitHub에 사용자 데이터 저장 성공")
        return True
    elif local_success:
        print("GitHub 저장 실패, 로컬 백업에만 저장됨")
        return True
    else:
        print("GitHub과 로컬 모두 저장 실패")
        return False

async def save_local_backup(filename: str, data: Dict) -> bool:
    """로컬에 백업 파일을 저장합니다."""
    try:
        backup_file = DATA_DIR / filename
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"로컬 백업 저장 오류: {e}")
        return False

async def load_users_from_local_backup() -> Dict[str, User]:
    """로컬 백업에서 사용자 정보를 로드합니다."""
    try:
        backup_file = DATA_DIR / "users.json"
        if backup_file.exists():
            with open(backup_file, 'r', encoding='utf-8') as f:
                users_data = json.load(f)
            print("로컬 백업에서 사용자 데이터 로드 성공")
            return {username: User(**user_data) for username, user_data in users_data.items()}
    except Exception as e:
        print(f"로컬 백업 로드 오류: {e}")
    
    print("로컬 백업도 없음, 빈 사용자 데이터 반환")
    return {}

def verify_password(password: str, password_hash: str) -> bool:
    """비밀번호를 검증합니다."""
    return hash_password(password) == password_hash

def get_user_data_dir(username: str) -> Path:
    """사용자별 데이터 디렉토리 경로를 반환합니다."""
    return DATA_DIR / f"user_{username}"

def ensure_user_data_dir(username: str) -> Path:
    """사용자별 데이터 디렉토리를 생성하고 경로를 반환합니다."""
    user_dir = get_user_data_dir(username)
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # 강의 목록 JSON 파일 초기화
    lectures_file = user_dir / "lectures.json"
    if not lectures_file.exists():
        with open(lectures_file, 'w', encoding='utf-8') as f:
            json.dump({"lectures": []}, f, ensure_ascii=False, indent=2)
    
    return user_dir

async def save_user_data_to_github(username: str, data_type: str, content: Dict, message: str = "Update user data") -> bool:
    """사용자 데이터를 GitHub에 저장합니다."""
    try:
        file_path = f"users/{username}/{data_type}.json"
        return await save_github_file_content(file_path, content, message)
    except Exception as e:
        print(f"GitHub 저장 실패: {e}")
        return False

async def load_user_data_from_github(username: str, data_type: str) -> Optional[Dict]:
    """GitHub에서 사용자 데이터를 불러옵니다."""
    try:
        file_path = f"users/{username}/{data_type}.json"
        return await get_github_file_content(file_path)
    except Exception as e:
        print(f"GitHub 로드 실패: {e}")
        return None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "message": "Slide Scribe API is running",
        "github_configured": bool(GITHUB_TOKEN and GITHUB_REPO)
    }

@app.get("/api/github/status")
async def github_status():
    """GitHub 연결 상태를 확인합니다."""
    try:
        if not GITHUB_TOKEN:
            return {
                "status": "not_configured",
                "message": "GitHub 토큰이 설정되지 않았습니다. .env 파일을 확인해주세요."
            }
            
        # GitHub API 기본 연결 테스트
        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}"
        headers = get_github_headers()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                repo_info = response.json()
                return {
                    "status": "connected",
                    "repository": repo_info.get("full_name"),
                    "private": repo_info.get("private"),
                    "message": "GitHub 연결 성공"
                }
            else:
                return {
                    "status": "error",
                    "message": f"GitHub API 오류: {response.status_code}",
                    "details": response.text if hasattr(response, 'text') else str(response.content)
                }
    except Exception as e:
        return {
            "status": "error",
            "message": f"GitHub 연결 실패: {str(e)}"
        }

# Lecture management endpoints
@app.get("/api/lectures")
async def get_lectures():
    """Get list of all lectures"""
    try:
        lectures = get_lectures_list()
        return {"lectures": lectures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lectures")
async def create_lecture(lecture: LectureCreate):
    """Create a new lecture"""
    try:
        if not lecture.name.strip():
            raise HTTPException(status_code=400, detail="Lecture name cannot be empty")
        
        lecture_dir = ensure_lecture_dir(lecture.name)
        return {"message": f"Lecture '{lecture.name}' created successfully", "path": str(lecture_dir)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/lectures/{lecture_name}")
async def delete_lecture(lecture_name: str):
    """Delete a lecture and all its records"""
    try:
        lecture_dir = get_lecture_dir(lecture_name)
        if lecture_dir.exists():
            shutil.rmtree(lecture_dir)
            return {"message": f"Lecture '{lecture_name}' deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Lecture not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Timer records endpoints
@app.get("/api/lectures/{lecture_name}/records")
async def get_lecture_records(lecture_name: str):
    """Get list of record files for a lecture"""
    try:
        records = get_record_files(lecture_name)
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lectures/{lecture_name}/records/{record_file}")
async def get_record_content(lecture_name: str, record_file: str):
    """Get content of a specific record file"""
    try:
        lecture_dir = get_lecture_dir(lecture_name)
        record_path = lecture_dir / record_file
        
        if not record_path.exists():
            raise HTTPException(status_code=404, detail="Record file not found")
        
        with open(record_path, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        return content
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lectures/{lecture_name}/records")
async def save_timer_session(lecture_name: str, session: TimerSession):
    """Save timer session records"""
    try:
        lecture_dir = ensure_lecture_dir(lecture_name)
        filename = generate_filename()
        file_path = lecture_dir / filename
        
        # Prepare data for saving
        save_data = {
            "lecture_name": lecture_name,
            "records": [record.dict() for record in session.records],
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "filename": filename
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return {
            "message": "Timer session saved successfully",
            "filename": filename,
            "path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/lectures/{lecture_name}/records/{record_file}")
async def delete_record(lecture_name: str, record_file: str):
    """Delete a specific record file"""
    try:
        lecture_dir = get_lecture_dir(lecture_name)
        record_path = lecture_dir / record_file
        
        if not record_path.exists():
            raise HTTPException(status_code=404, detail="Record file not found")
        
        record_path.unlink()
        return {"message": f"Record '{record_file}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/lectures/{lecture_name}/records/{record_file}/download")
async def download_record(lecture_name: str, record_file: str):
    """Download a record file"""
    try:
        lecture_dir = get_lecture_dir(lecture_name)
        record_path = lecture_dir / record_file
        
        if not record_path.exists():
            raise HTTPException(status_code=404, detail="Record file not found")
        
        return FileResponse(
            path=record_path,
            filename=record_file,
            media_type='application/json'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lectures/{lecture_name}/upload")
async def upload_json_record(lecture_name: str, file: UploadFile = File(...)):
    """Upload and save JSON record file for a lecture"""
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Only JSON files are allowed")
        
        # Read and validate JSON content
        content = await file.read()
        try:
            json_content = content.decode('utf-8')
            json_data = json.loads(json_content)
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8 encoded JSON file")
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
        
        # Validate JSON structure for timer records
        if isinstance(json_data, dict) and 'records' in json_data:
            # Standard timer session format
            records = json_data['records']
        elif isinstance(json_data, list):
            # Direct array of records
            records = json_data
        else:
            raise HTTPException(status_code=400, detail="Invalid JSON structure. Expected array of records or object with 'records' field")
        
        # Validate record structure
        required_fields = ['slide_title', 'slide_number', 'start_time', 'end_time']
        for i, record in enumerate(records):
            if not isinstance(record, dict):
                raise HTTPException(status_code=400, detail=f"Record {i+1} is not a valid object")
            for field in required_fields:
                if field not in record:
                    raise HTTPException(status_code=400, detail=f"Record {i+1} missing required field: {field}")
        
        # Ensure lecture directory exists
        lecture_dir = ensure_lecture_dir(lecture_name)
        
        # Generate unique filename
        original_name = Path(file.filename).stem
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{original_name}_{timestamp}.json"
        file_path = lecture_dir / filename
        
        # Prepare data for saving
        save_data = {
            "lecture_name": lecture_name,
            "records": records,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "filename": filename,
            "uploaded_from": file.filename
        }
        
        # Save file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        return {
            "message": f"JSON file '{file.filename}' uploaded successfully",
            "filename": filename,
            "path": str(file_path),
            "records_count": len(records),
            "lecture_name": lecture_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# SRT Parser endpoints
@app.post("/api/srt/upload")
async def upload_srt_file(file: UploadFile = File(...)):
    """Upload and validate SRT file"""
    try:
        if not file.filename.endswith('.srt'):
            raise HTTPException(status_code=400, detail="Only SRT files are allowed")
        
        # Read file content
        content = await file.read()
        srt_content = content.decode('utf-8')
        
        # Validate SRT format by parsing
        subtitles = parse_srt_content(srt_content)
        
        if not subtitles:
            raise HTTPException(status_code=400, detail="Invalid SRT file or no subtitles found")
        
        # Save uploaded file
        file_id = f"srt_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = UPLOADS_DIR / file_id
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(srt_content)
        
        return {
            "message": "SRT file uploaded successfully",
            "file_id": file_id,
            "filename": file.filename,
            "subtitle_count": len(subtitles),
            "duration": f"{subtitles[-1]['end_time']:.1f}s" if subtitles else "0s",
            "preview": subtitles[:3] if len(subtitles) > 3 else subtitles
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please use UTF-8 encoded SRT file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/srt/parse")
async def parse_srt_with_timer_record(
    file_id: str = Form(...),
    lecture_name: str = Form(...),
    record_file: str = Form(...)
):
    """Parse SRT file with timer record to extract slide texts"""
    try:
        # Load SRT file
        srt_path = UPLOADS_DIR / file_id
        if not srt_path.exists():
            raise HTTPException(status_code=404, detail="SRT file not found. Please upload the file again.")
        
        with open(srt_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
        
        # Load timer record
        lecture_dir = get_lecture_dir(lecture_name)
        record_path = lecture_dir / record_file
        
        if not record_path.exists():
            raise HTTPException(status_code=404, detail="Timer record not found")
        
        with open(record_path, 'r', encoding='utf-8') as f:
            timer_data = json.load(f)
        
        # Extract records
        timer_records = timer_data.get('records', [])
        if not timer_records:
            raise HTTPException(status_code=400, detail="No timer records found in the file")
        
        # Process SRT with timer records
        result_data = process_srt_with_timer(srt_content, timer_records)
        
        if not result_data:
            raise HTTPException(status_code=400, detail="No matching content found between SRT and timer records")
        
        return {
            "message": "SRT parsing completed successfully",
            "slide_count": len(result_data),
            "results": result_data,
            "metadata": {
                "lecture_name": lecture_name,
                "record_file": record_file,
                "srt_file": file_id,
                "processed_at": datetime.now().isoformat()
            }
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid timer record file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/srt/preview/{file_id}")
async def preview_srt_file(file_id: str, limit: int = 10):
    """Preview SRT file content"""
    try:
        srt_path = UPLOADS_DIR / file_id
        if not srt_path.exists():
            raise HTTPException(status_code=404, detail="SRT file not found")
        
        with open(srt_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
        
        subtitles = parse_srt_content(srt_content)
        
        return {
            "filename": file_id,
            "total_subtitles": len(subtitles),
            "duration": f"{subtitles[-1]['end_time']:.1f}s" if subtitles else "0s",
            "preview": subtitles[:limit],
            "sample_text": subtitles[0]['text'] if subtitles else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/srt/export")
async def export_parsed_results(results: List[Dict[str, Any]]):
    """Export parsed results as JSON file"""
    try:
        if not results:
            raise HTTPException(status_code=400, detail="No results to export")
        
        # Generate export filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"parsed_results_{timestamp}.json"
        file_path = UPLOADS_DIR / filename
        
        # Prepare export data
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "slide_count": len(results),
            "slides": results
        }
        
        # Save to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        return {
            "message": "Results exported successfully",
            "filename": filename,
            "download_url": f"/api/srt/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/srt/download/{filename}")
async def download_exported_file(filename: str):
    """Download exported results file"""
    try:
        file_path = UPLOADS_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/json'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/srt/parse-with-data")
async def parse_srt_with_timer_data(
    file_id: str = Form(...),
    timer_records: str = Form(...)
):
    """Parse SRT file with timer record data (from localStorage)"""
    try:
        # Load SRT file
        srt_path = UPLOADS_DIR / file_id
        if not srt_path.exists():
            raise HTTPException(status_code=404, detail="SRT file not found. Please upload the file again.")
        
        with open(srt_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()
        
        # Parse timer records from JSON string
        try:
            timer_data = json.loads(timer_records)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid timer records data")
        
        if not isinstance(timer_data, list):
            raise HTTPException(status_code=400, detail="Timer records must be an array")
        
        if not timer_data:
            raise HTTPException(status_code=400, detail="No timer records found")
        
        # Process SRT with timer records
        result_data = process_srt_with_timer(srt_content, timer_data)
        
        if not result_data:
            raise HTTPException(status_code=400, detail="No matching content found between SRT and timer records")
        
        return {
            "message": "SRT parsing completed successfully",
            "slide_count": len(result_data),
            "results": result_data,
            "metadata": {
                "srt_file": file_id,
                "processed_at": datetime.now().isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User Management APIs
@app.post("/api/auth/register")
async def register_user(user_data: UserCreate):
    """새 사용자를 등록합니다."""
    users = await load_users_from_github()
    
    # 사용자명 중복 체크
    if user_data.username in users:
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자명입니다")
    
    # 새 사용자 생성
    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        created_at=datetime.now().isoformat()
    )
    
    users[user_data.username] = new_user
    await save_users_to_github(users)
    
    return {
        "success": True,
        "message": "회원가입이 완료되었습니다",
        "user": {
            "username": new_user.username,
            "created_at": new_user.created_at
        }
    }

@app.post("/api/auth/login")
async def login_user(user_data: UserLogin):
    """사용자 로그인을 처리합니다."""
    users = await load_users_from_github()
    
    # 사용자 존재 확인
    if user_data.username not in users:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
    
    user = users[user_data.username]
    
    # 비밀번호 확인
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다")
    
    return {
        "success": True,
        "message": "로그인 성공",
        "user": {
            "username": user.username,
            "created_at": user.created_at
        }
    }

@app.get("/api/auth/users")
async def get_all_users():
    """모든 사용자 목록을 반환합니다 (관리용)."""
    users = await load_users_from_github()
    return {
        "users": [
            {
                "username": user.username,
                "created_at": user.created_at
            }
            for user in users.values()
        ]
    }

@app.delete("/api/auth/users/{username}")
async def delete_user(username: str):
    """사용자를 삭제합니다."""
    users = await load_users_from_github()
    
    if username not in users:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    del users[username]
    await save_users_to_github(users)
    
    # 해당 사용자의 데이터 폴더도 삭제 (선택사항)
    user_data_dir = DATA_DIR / f"user_{username}"
    if user_data_dir.exists():
        shutil.rmtree(user_data_dir)
    
    return {"success": True, "message": f"사용자 {username}이 삭제되었습니다"}

@app.get("/api/users/{username}/lectures")
async def get_user_lectures(username: str):
    """사용자의 강의 목록을 반환합니다."""
    try:
        # GitHub에서 데이터 로드 시도
        github_data = await load_user_data_from_github(username, "lectures")
        if github_data:
            return github_data
        
        # 로컬 백업에서 로드
        user_dir = get_user_data_dir(username)
        lectures_file = user_dir / "lectures.json"
        
        if lectures_file.exists():
            with open(lectures_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            return {"lectures": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"강의 목록 로드 실패: {str(e)}")

@app.post("/api/users/{username}/lectures")
async def create_user_lecture(username: str, lecture: UserLectureCreate):
    """사용자의 새 강의를 생성합니다."""
    try:
        # 현재 강의 목록 로드
        current_data = await load_user_data_from_github(username, "lectures")
        if not current_data:
            # 로컬에서 로드
            user_dir = ensure_user_data_dir(username)
            lectures_file = user_dir / "lectures.json"
            
            if lectures_file.exists():
                with open(lectures_file, 'r', encoding='utf-8') as f:
                    current_data = json.load(f)
            else:
                current_data = {"lectures": []}
        
        # 중복 확인
        existing_names = [l.get("name", "") for l in current_data.get("lectures", [])]
        if lecture.name in existing_names:
            raise HTTPException(status_code=400, detail="이미 존재하는 강의명입니다")
        
        # 새 강의 추가
        new_lecture = {
            "id": str(uuid.uuid4()),
            "name": lecture.name,
            "created_at": datetime.now().isoformat()
        }
        
        current_data["lectures"].append(new_lecture)
        
        # GitHub에 저장
        github_success = await save_user_data_to_github(
            username, "lectures", current_data, 
            f"Add lecture: {lecture.name}"
        )
        
        # 로컬 백업
        user_dir = ensure_user_data_dir(username)
        lectures_file = user_dir / "lectures.json"
        with open(lectures_file, 'w', encoding='utf-8') as f:
            json.dump(current_data, f, ensure_ascii=False, indent=2)
        
        return {
            "success": True,
            "message": "강의가 성공적으로 생성되었습니다",
            "lecture": new_lecture,
            "github_sync": github_success
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"강의 생성 실패: {str(e)}")

@app.delete("/api/users/{username}/lectures/{lecture_id}")
async def delete_user_lecture(username: str, lecture_id: str):
    """사용자의 강의를 삭제합니다."""
    try:
        # 현재 강의 목록 로드
        current_data = await load_user_data_from_github(username, "lectures")
        if not current_data:
            user_dir = get_user_data_dir(username)
            lectures_file = user_dir / "lectures.json"
            
            if lectures_file.exists():
                with open(lectures_file, 'r', encoding='utf-8') as f:
                    current_data = json.load(f)
            else:
                raise HTTPException(status_code=404, detail="강의 목록을 찾을 수 없습니다")
        
        # 강의 찾기 및 삭제
        lectures = current_data.get("lectures", [])
        lecture_to_delete = None
        
        for i, lecture in enumerate(lectures):
            if lecture.get("id") == lecture_id:
                lecture_to_delete = lectures.pop(i)
                break
        
        if not lecture_to_delete:
            raise HTTPException(status_code=404, detail="강의를 찾을 수 없습니다")
        
        # 해당 강의의 모든 타이머 기록 파일 삭제
        await delete_all_lecture_records(username, lecture_id)
        
        # GitHub에 저장
        github_success = await save_user_data_to_github(
            username, "lectures", current_data,
            f"Delete lecture: {lecture_to_delete.get('name', 'Unknown')}"
        )
        
        # 로컬 백업
        user_dir = ensure_user_data_dir(username)
        lectures_file = user_dir / "lectures.json"
        with open(lectures_file, 'w', encoding='utf-8') as f:
            json.dump(current_data, f, ensure_ascii=False, indent=2)
        
        return {
            "success": True,
            "message": "강의가 성공적으로 삭제되었습니다",
            "deleted_lecture": lecture_to_delete,
            "github_sync": github_success
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"강의 삭제 실패: {str(e)}")

@app.post("/api/users/{username}/lectures/{lecture_id}/timer-records")
async def save_user_timer_record(username: str, lecture_id: str, session: TimerSession):
    """사용자의 특정 강의에 타이머 기록을 독립된 JSON 파일로 저장합니다."""
    try:
        # 강의 존재 확인
        current_data = await load_user_data_from_github(username, "lectures")
        if not current_data:
            user_dir = get_user_data_dir(username)
            lectures_file = user_dir / "lectures.json"
            
            if lectures_file.exists():
                with open(lectures_file, 'r', encoding='utf-8') as f:
                    current_data = json.load(f)
            else:
                raise HTTPException(status_code=404, detail="강의 목록을 찾을 수 없습니다")
        
        # 강의 찾기
        lectures = current_data.get("lectures", [])
        target_lecture = None
        
        for lecture in lectures:
            if lecture.get("id") == lecture_id:
                target_lecture = lecture
                break
        
        if not target_lecture:
            raise HTTPException(status_code=404, detail="강의를 찾을 수 없습니다")
        
        # 타이머 기록 데이터 준비
        record_id = str(uuid.uuid4())
        
        # 강의명을 파일명에 사용
        lecture_name = target_lecture.get("name", "")
        
        # 사용자 친화적인 파일명 생성
        friendly_filename = session.lecture_name
        
        # 파일명에 사용할 수 없는 문자 처리
        sanitized_filename = friendly_filename.replace('/', '_').replace('\\', '_').replace(':', '_').replace('*', '_').replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
        
        timer_record = {
            "id": record_id,
            "lecture_id": lecture_id,
            "lecture_name": lecture_name,
            "session_name": session.lecture_name,
            "records": [record.dict() for record in session.records],
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }
        
        # 독립된 JSON 파일로 저장
        github_success = await save_timer_record_file(username, lecture_id, record_id, timer_record, sanitized_filename)
        
        return {
            "success": True,
            "message": "타이머 기록이 성공적으로 저장되었습니다",
            "timer_record": {
                "id": record_id,
                "session_name": session.lecture_name,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "records_count": len(session.records)
            },
            "github_sync": github_success
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"타이머 기록 저장 실패: {str(e)}")

@app.get("/api/users/{username}/sync-status")
async def get_user_sync_status(username: str):
    """사용자의 GitHub 동기화 상태를 확인합니다."""
    try:
        if not GITHUB_TOKEN:
            return {
                "github_configured": False,
                "message": "GitHub 토큰이 설정되지 않았습니다"
            }
        
        # GitHub 연결 테스트
        test_data = await load_user_data_from_github(username, "lectures")
        
        return {
            "github_configured": True,
            "github_connected": True,
            "last_sync_test": datetime.now().isoformat(),
            "message": "GitHub 동기화가 정상적으로 작동합니다"
        }
    except Exception as e:
        return {
            "github_configured": bool(GITHUB_TOKEN),
            "github_connected": False,
            "error": str(e),
            "message": "GitHub 연결에 문제가 있습니다"
        }

@app.get("/api/users/{username}/lectures/{lecture_id}/timer-records")
async def get_user_timer_records(username: str, lecture_id: str):
    """사용자의 특정 강의의 모든 타이머 기록 목록을 반환합니다."""
    try:
        records = await list_timer_records(username, lecture_id)
        return {
            "success": True,
            "records": records,
            "total_count": len(records)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"타이머 기록 목록 로드 실패: {str(e)}")

@app.get("/api/users/{username}/lectures/{lecture_id}/timer-records/{record_id}")
async def get_user_timer_record(username: str, lecture_id: str, record_id: str):
    """사용자의 특정 타이머 기록 내용을 반환합니다."""
    try:
        record_data = await load_timer_record_file(username, lecture_id, record_id)
        
        if not record_data:
            raise HTTPException(status_code=404, detail="타이머 기록을 찾을 수 없습니다")
        
        return {
            "success": True,
            "record": record_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"타이머 기록 로드 실패: {str(e)}")

@app.delete("/api/users/{username}/lectures/{lecture_id}/timer-records/{record_id}")
async def delete_user_timer_record(username: str, lecture_id: str, record_id: str):
    """사용자의 특정 타이머 기록을 삭제합니다."""
    try:
        success = await delete_timer_record_file(username, lecture_id, record_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="타이머 기록을 찾을 수 없습니다")
        
        return {
            "success": True,
            "message": "타이머 기록이 성공적으로 삭제되었습니다"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"타이머 기록 삭제 실패: {str(e)}")

async def get_github_directory_contents(dir_path: str) -> List[str]:
    """GitHub에서 디렉토리 내 파일 목록을 가져옵니다."""
    headers = get_github_headers()
    if not headers:
        return []
        
    try:
        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/contents/{dir_path}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 404:
                return []  # 디렉토리가 없으면 빈 리스트 반환
            
            if response.status_code != 200:
                print(f"GitHub API 오류: {response.status_code}")
                return []
                
            data = response.json()
            
            # 파일들만 필터링 (디렉토리 제외)
            if isinstance(data, list):
                files = [item['name'] for item in data if item['type'] == 'file' and item['name'].endswith('.json')]
                return files
            
            return []
            
    except Exception as e:
        print(f"GitHub 디렉토리 내용 가져오기 오류: {e}")
        return []

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 