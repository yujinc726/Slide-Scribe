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

# SRT parsing utilities
_TIME_RE = re.compile(r"(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2})[.,](?P<ms>\d{3})")

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

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Slide Scribe API is running"}

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
            "updated_at": datetime.now().isoformat(),
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 