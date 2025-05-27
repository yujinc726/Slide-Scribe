# Slide Scribe

발표용 슬라이드 타이머와 스크립트 관리 도구입니다.

## 🚀 기능

- **슬라이드 타이머**: 발표 시간을 측정하고 각 슬라이드별 시간을 기록
- **SRT 파서**: 자막 파일과 타이머 기록을 매칭하여 스크립트 생성
- **사용자 관리**: GitHub 저장소를 통한 데이터 동기화
- **데이터 관리**: JSON 파일 편집 및 내보내기/가져오기

## 📋 요구사항

- Python 3.8+
- FastAPI
- GitHub 계정 (데이터 동기화용)

## 🛠️ 설치 방법

1. **저장소 클론**
```bash
git clone <repository-url>
cd Slide_Scribe
```

2. **종속성 설치**
```bash
pip install -r requirements.txt
```

3. **환경변수 설정**

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
# GitHub 설정 (필수)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=username/repository_name

# 예시:
# GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# GITHUB_REPO=yujinc726/Slide-Scribe_data
```

### GitHub 토큰 생성 방법

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. 다음 권한 선택:
   - `repo` (전체 저장소 액세스)
   - `user` (사용자 정보 읽기)
4. 생성된 토큰을 `.env` 파일에 추가

### GitHub 저장소 준비

1. 데이터 저장용 GitHub 저장소 생성
2. 저장소 이름을 `GITHUB_REPO` 환경변수에 설정
3. 저장소는 private으로 설정하는 것을 권장

## 🚀 실행 방법

### 로컬 개발 환경

```bash
uvicorn backend:app --reload --host 0.0.0.0 --port 8000
```

### 운영 환경 (AWS/Linux 서버)

1. **환경변수 설정**
```bash
# 방법 1: 현재 세션에만 적용
export GITHUB_TOKEN="your_token_here"
export GITHUB_REPO="username/repository_name"

# 방법 2: 영구 설정 (추천)
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.bashrc
echo 'export GITHUB_REPO="username/repository_name"' >> ~/.bashrc
source ~/.bashrc
```

2. **서버 실행**
```bash
uvicorn backend:app --host 0.0.0.0 --port 8000
```

## 📁 프로젝트 구조

```
Slide_Scribe/
├── backend.py              # FastAPI 백엔드 서버
├── requirements.txt        # Python 종속성
├── .env                    # 환경변수 (생성 필요)
├── .gitignore             # Git 무시 파일
├── static/                # 프론트엔드 파일
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── data/                  # 로컬 데이터 (자동 생성)
    ├── lectures/          # 강의 데이터
    └── uploads/           # 업로드된 파일
```

## 🔒 보안 고려사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- GitHub 토큰은 최소 권한만 부여하세요
- 정기적으로 토큰을 갱신하세요
- 운영 서버에서는 HTTPS를 사용하세요

## 📊 데이터 저장

- **GitHub 저장소**: 사용자 데이터와 강의 기록의 주 저장소
- **로컬 백업**: GitHub 연결 실패 시 로컬 `data/` 폴더에 백업
- **이중 백업**: 데이터 안정성을 위한 GitHub + 로컬 동시 저장

## 🚨 문제 해결

### GitHub 연결 실패
```
⚠️ GitHub 토큰이 설정되지 않았습니다.
```
→ `.env` 파일에 올바른 `GITHUB_TOKEN` 설정 확인

### 403 Forbidden 오류
→ GitHub 토큰 권한 확인 또는 토큰 재생성

### 데이터 손실 방지
→ 정기적으로 "모든 데이터 내보내기" 기능 사용

## 📞 지원

문제가 발생하면 Issue를 등록해주세요. 