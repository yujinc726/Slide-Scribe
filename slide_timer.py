import streamlit as st
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
import os
import pandas as pd
import streamlit.components.v1 as components
from utils import get_user_base_dir, load_lecture_names
from utils import list_json_files_for_lecture
from github_storage import github_enabled, load_json, save_json

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _user_id():
    return st.session_state.get('user_id', 'anonymous')

def ensure_directory(directory):
    """디렉토리가 존재하는지 확인하고 없으면 생성"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def save_records_to_json(lecture_name, records):

    now_kst = datetime.now(tz=ZoneInfo("Asia/Seoul"))
    date = now_kst.strftime("%Y-%m-%d")
    timestamp = now_kst.strftime("%H%M%S")
    filename = f"{date}_{timestamp}.json"

    # --- primary: GitHub ---
    if github_enabled():
        if save_json(_user_id(), lecture_name, filename, records):
            # 새 파일을 캐시에 반영하여 이후 rerun 에서 GitHub 호출이 발생하지 않도록 함
            key = f"json_files_{lecture_name}"
            new_path = f"github://{lecture_name}/{filename}"
            st.session_state.setdefault(key, [])
            if new_path not in st.session_state[key]:
                st.session_state[key].insert(0, new_path)
            return new_path

    # --- fallback: local ---
    try:
        directory = os.path.join(get_user_base_dir(), lecture_name)
        ensure_directory(directory)
        file_path = os.path.join(directory, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        # update local cache as well
        key = f"json_files_{lecture_name}"
        st.session_state.setdefault(key, [])
        if file_path not in st.session_state[key]:
            st.session_state[key].insert(0, file_path)

        return file_path
    except Exception as e:
        st.error(f"JSON 파일 저장 중 오류: {e}")
        return None

def load_records_from_json(file_path_or_ref):
    """Load records from local path or github ref (github://lecture/file)."""
    if file_path_or_ref is None:
        return []
    if file_path_or_ref.startswith("github://"):
        path_part = file_path_or_ref.replace("github://", "", 1)
        lecture, filename = path_part.split("/", 1)
        return load_json(_user_id(), lecture, filename)
    try:
        with open(file_path_or_ref, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        st.error("JSON 파일 로드 중 오류")
        return []

def lecture_timer_tab():
    """Slide Timer 탭 구현"""
    #st.header("Slide Timer")

    # 세션 상태 초기화
    if 'timer_running' not in st.session_state:
        st.session_state.timer_running = False
    if 'start_time' not in st.session_state:
        st.session_state.start_time = None
    if 'timer_start' not in st.session_state:
        st.session_state.timer_start = None
    if 'elapsed_time' not in st.session_state:
        st.session_state.elapsed_time = 0
    if 'last_slide_start_time' not in st.session_state:
        st.session_state.last_slide_start_time = None
    if 'records' not in st.session_state:
        st.session_state.records = []
    if 'slide_number' not in st.session_state:
        st.session_state.slide_number = 1
    if 'start_time_value' not in st.session_state:
        st.session_state.start_time_value = "00:00:00.000"
    if 'selected_json_file' not in st.session_state:
        st.session_state.selected_json_file = None
    if 'slide_title' not in st.session_state:
        st.session_state.slide_title = ""
    if 'should_reset_notes' in st.session_state and st.session_state.should_reset_notes:
        st.session_state.notes = ""
        st.session_state.should_reset_notes = False
    elif 'notes' not in st.session_state:
        st.session_state.notes = ""

    # 두 개의 주요 컬럼으로 레이아웃 구성
    left_col, right_col = st.columns([1, 2])

    available_lectures = load_lecture_names()
    with left_col:
        lecture_name = st.selectbox(
            "강의 선택",
            available_lectures,
            key="lecture_name",
            index=None,
            placeholder="강의를 선택해주세요",
            disabled=st.session_state.timer_running
        )
        
        if not available_lectures:
            st.info("Settings 탭에서 강의를 추가해주세요.")
        
        # 기존 JSON 파일 선택
        json_files = get_existing_json_files(lecture_name)
        json_options = ["새 기록 시작"] + [os.path.basename(f) for f in json_files]
        selected_json = st.selectbox(
            "기록 선택",
            json_options,
            key="json_file_select",
            on_change=lambda: load_selected_json(json_files, json_options),
            disabled=st.session_state.timer_running
        )

        def load_selected_json(json_files, json_options):
            """선택한 JSON 파일 로드 및 세션 상태 업데이트"""
            selected_index = json_options.index(st.session_state.json_file_select)
            if selected_index == 0:  # 새 기록 시작
                st.session_state.records = []
                st.session_state.slide_number = 1
                st.session_state.last_slide_start_time = None
                st.session_state.elapsed_time = 0
                st.session_state.start_time = None
                st.session_state.start_time_value = "00:00:00.000"
                st.session_state.selected_json_file = None
            else:
                file_path = json_files[selected_index - 1]
                records = load_records_from_json(file_path)
                if records:
                    st.session_state.records = records
                    st.session_state.selected_json_file = file_path
                    # 마지막 슬라이드 번호 설정
                    last_slide = max([int(r["slide_number"]) for r in records], default=0)
                    st.session_state.slide_number = last_slide + 1
                    # 마지막 슬라이드의 종료 시간 설정
                    last_record = records[-1]
                    st.session_state.last_slide_start_time = last_record["end_time"]
                    # 시작 시간 설정
                    try:
                        start_time_str = records[-1]["end_time"]
                        st.session_state.start_time = datetime.strptime(start_time_str, "%H:%M:%S.%f")
                        st.session_state.start_time_value = start_time_str
                        # 경과 시간 계산 (마지막 종료 시간 - 시작 시간)
                        last_end_time = datetime.strptime(last_record["end_time"], "%H:%M:%S.%f")
                        st.session_state.elapsed_time = (last_end_time - st.session_state.start_time).total_seconds() * 1000
                    except ValueError:
                        st.session_state.start_time = None
                        st.session_state.start_time_value = "00:00:00.000"
                        st.session_state.elapsed_time = 0
                else:
                    st.session_state.records = []
                    st.session_state.slide_number = 1
                    st.session_state.last_slide_start_time = None
                    st.session_state.elapsed_time = 0
                    st.session_state.start_time = None
                    st.session_state.start_time_value = "00:00:00.000"
        def update_slide_number():
            st.session_state.slide_number = st.session_state.slide_number_input
        slide_title_col, slide_number_col = st.columns([2, 1])
        with slide_title_col:
            st.text_input("Slide Title", key="slide_title", placeholder="강의안 파일명을 입력해주세요.")
        with slide_number_col:
            st.number_input("Slide Number", min_value=0, value=st.session_state.slide_number, step=1, key="slide_number_input", on_change=update_slide_number)
        # Start Time 입력 필드 (Pause 상태에서만 편집 가능)
        start_time_input = st.text_input(
            "Start Time",
            value=st.session_state.start_time_value,
            key="start_time_input",
            placeholder="00:00:00.000",
            disabled=st.session_state.timer_running
        )
        # Update start_time_value with user input
        st.session_state.start_time_value = start_time_input
        # 타이머 표시
        elapsed_ms = st.session_state.elapsed_time
        if st.session_state.timer_running and st.session_state.timer_start:
            elapsed_ms += (datetime.now() - st.session_state.timer_start).total_seconds() * 1000
        elapsed_seconds = elapsed_ms / 1000
        if st.session_state.start_time:
            absolute_time = st.session_state.start_time + timedelta(seconds=elapsed_seconds)
            initial_time = absolute_time.strftime("%H:%M:%S.%f")[:-3]
        else:
            hours = int(elapsed_seconds // 3600)
            minutes = int((elapsed_seconds % 3600) // 60)
            seconds = int(elapsed_seconds % 60)
            milliseconds = int(elapsed_ms % 1000)
            initial_time = f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

        # JavaScript로 전달할 start_time_ms 계산
        start_time_ms = 0
        if st.session_state.start_time:
            start_time_ms = (
                st.session_state.start_time.hour * 3600 +
                st.session_state.start_time.minute * 60 +
                st.session_state.start_time.second +
                st.session_state.start_time.microsecond / 1000000
            ) * 1000
        
        timer_html = f"""
        <div id="timer-display" style="font-size: 18px; font-weight: bold; padding: 10px; border: 1px solid #ddd; border-radius: 5px; text-align: center; background-color: var(--background-color, #ffffff); color: var(--text-color, #000000);">{initial_time}</div>
        <script>
            let timerRunning = {str(st.session_state.timer_running).lower()};
            let startTime = new Date().getTime();
            let elapsedTime = {elapsed_ms};
            let baseTimeMs = {start_time_ms};

            function updateTimer() {{
                if (timerRunning) {{
                    let now = new Date().getTime();
                    let elapsedMs = elapsedTime + (now - startTime);
                    let totalMs = baseTimeMs + elapsedMs;
                    let hours = Math.floor(totalMs / (1000 * 3600));
                    let minutes = Math.floor((totalMs % (1000 * 3600)) / (1000 * 60));
                    let seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
                    let milliseconds = Math.floor(totalMs % 1000);
                    let timeStr = hours.toString().padStart(2, '0') + ':' +
                                minutes.toString().padStart(2, '0') + ':' +
                                seconds.toString().padStart(2, '0') + '.' +
                                milliseconds.toString().padStart(3, '0');
                    let display = document.getElementById('timer-display');
                    if (display) {{
                        display.innerText = timeStr;
                    }}
                }}
            }}

            // 테마 감지 및 스타일 업데이트
            function updateTheme() {{
                const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const timerDisplay = document.getElementById('timer-display');
                if (timerDisplay) {{
                    if (isDarkMode) {{
                        timerDisplay.style.backgroundColor = '#1a1a1a'; // 다크 모드 배경
                        timerDisplay.style.color = '#ffffff'; // 다크 모드 글씨
                    }} else {{
                        timerDisplay.style.backgroundColor = '#ffffff'; // 라이트 모드 배경
                        timerDisplay.style.color = '#000000'; // 라이트 모드 글씨
                    }}
                }}
            }}

            // 초기 테마 설정 및 테마 변경 감지
            updateTheme();
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);

            // 타이머 업데이트
            let timerInterval = setInterval(updateTimer, 10);

            // 컴포넌트 언마운트 시 정리
            window.addEventListener('unload', () => clearInterval(timerInterval));
        </script>
        """
        components.html(timer_html, height=60)
        col1, col2, col3 = st.columns([1, 1, 1])
        with col1:
            start_button_label = "Resume" if st.session_state.elapsed_time > 0 and not st.session_state.timer_running else "Start"
            if st.button(start_button_label, disabled=st.session_state.timer_running, use_container_width=True):
                # Start 버튼 클릭 시
                try:
                    start_time_str = start_time_input
                    new_start_time = datetime.strptime(start_time_str, "%H:%M:%S.%f")
                    new_start_time = datetime.combine(datetime.now().date(), new_start_time.time())
                    if new_start_time > datetime.now():
                        new_start_time -= timedelta(days=1)
                    
                    # Check if start_time has changed
                    current_start_time_str = st.session_state.start_time.strftime("%H:%M:%S.%f")[:-3] if st.session_state.start_time else "00:00:00.000"
                    if start_time_str != current_start_time_str:
                        # Reset elapsed_time if start_time is modified
                        st.session_state.elapsed_time = 0
                        st.session_state.last_slide_start_time = new_start_time.strftime("%H:%M:%S.%f")[:-3]
                    
                    st.session_state.start_time = new_start_time
                except ValueError:
                    st.session_state.start_time = datetime.combine(datetime.now().date(), datetime.time(0, 0, 0))
                    st.session_state.elapsed_time = 0
                    st.session_state.last_slide_start_time = st.session_state.start_time.strftime("%H:%M:%S.%f")[:-3]
                
                # Set timer_running and update timer_start
                st.session_state.timer_running = True
                st.session_state.timer_start = datetime.now()
                
                st.rerun()
        with col2:
            if st.button("Pause", disabled=not st.session_state.timer_running, use_container_width=True):
                st.session_state.timer_running = False
                # 현재까지 경과한 시간을 누적
                if st.session_state.timer_start:
                    st.session_state.elapsed_time += (datetime.now() - st.session_state.timer_start).total_seconds() * 1000
                    # Start Time 입력 칸 업데이트
                elapsed_seconds = st.session_state.elapsed_time / 1000
                if st.session_state.start_time:
                    absolute_time = st.session_state.start_time + timedelta(seconds=elapsed_seconds)
                    st.session_state.start_time_value = absolute_time.strftime("%H:%M:%S.%f")[:-3]
                else:
                    hours = int(elapsed_seconds // 3600)
                    minutes = int((elapsed_seconds % 3600) // 60)
                    seconds = int(elapsed_seconds % 60)
                    milliseconds = int(st.session_state.elapsed_time % 1000)
                    st.session_state.start_time_value = f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
                st.rerun()
        with col3:
            if st.button("Reset", use_container_width=True):
                st.session_state.timer_running = False
                st.session_state.elapsed_time = 0
                st.session_state.start_time = None
                st.session_state.timer_start = None
                st.session_state.last_slide_start_time = None
                st.session_state.records = []
                st.session_state.slide_number = 1
                st.session_state.start_time_value = "00:00:00.000"
                st.session_state.selected_json_file = None
                st.rerun()

        # Note 섹션
        st.text_input("Notes", key="notes", placeholder="메모를 입력해주세요.")

        if st.button("Record Time", key="record_button", help="Press to record", type='primary', use_container_width=True, disabled=not lecture_name):
            try:
                # 현재 경과 시간 계산
                current_elapsed_ms = st.session_state.elapsed_time
                if st.session_state.timer_running and st.session_state.timer_start:
                    current_elapsed_ms += (datetime.now() - st.session_state.timer_start).total_seconds() * 1000
                
                # start_time 확인 및 기본값 설정
                if st.session_state.start_time is None:
                    st.session_state.start_time = datetime.combine(datetime.now().date(), datetime.time(0, 0, 0))
                
                # 현재 시간 계산
                elapsed_seconds = current_elapsed_ms / 1000
                current_time = st.session_state.start_time + timedelta(seconds=elapsed_seconds)
                current_time_str = current_time.strftime("%H:%M:%S.%f")[:-3]
                
                # 이전 슬라이드의 시작 시간
                start_time = st.session_state.last_slide_start_time if st.session_state.last_slide_start_time else st.session_state.start_time.strftime("%H:%M:%S.%f")[:-3]
                
                # 기록 추가
                st.session_state.records.append({
                    "slide_title": st.session_state.slide_title,
                    "slide_number": str(st.session_state.slide_number),
                    "start_time": start_time,
                    "end_time": current_time_str,
                    "notes": st.session_state.notes
                })
                
                # 다음 슬라이드의 시작 시간 및 슬라이드 번호 업데이트
                st.session_state.last_slide_start_time = current_time_str
                st.session_state.slide_number += 1
                st.session_state.should_reset_notes = True
                st.rerun()
            except Exception as e:
                st.session_state.records.append({
                    "slide_title": st.session_state.slide_title,
                    "slide_number": str(st.session_state.slide_number),
                    "start_time": st.session_state.start_time_value,
                    "end_time": "00:00:00.000",
                    "notes": st.session_state.notes
                })
                st.session_state.slide_number += 1
                st.session_state.should_reset_notes = True
                st.rerun()

        # JSON 저장
        if st.button("기록 저장", use_container_width=True, disabled=not st.session_state.records):
            json_file_path = save_records_to_json(
                lecture_name,
                st.session_state.records
            )
            
            if json_file_path:
                st.success(f"JSON 파일이 저장되었습니다: {json_file_path}")
                st.session_state.selected_json_file = json_file_path

    with right_col:
        # 기록된 시간 표시
        st.subheader("Records")
        if st.session_state.records:
            df = pd.DataFrame(st.session_state.records)
            edited_df = st.data_editor(
                df,
                num_rows="dynamic",
                use_container_width=True,
                column_config={
                    "slide_title": st.column_config.TextColumn("Slide Title", help="강의안명"),
                    "slide_number": st.column_config.TextColumn("Slide Number", help="슬라이드 번호"),
                    "start_time": st.column_config.TextColumn("Start Time", help="시작 시간"),
                    "end_time": st.column_config.TextColumn("End Time", help="종료 시간"),
                    "notes": st.column_config.TextColumn("Notes", help="메모")
                }
            )
            if edited_df is not None:
                st.session_state.records = edited_df.to_dict('records')
        else:
            st.info("표시할 기록이 없습니다.")

# ---------------------------------------------------------------------------
# Cached JSON file list per lecture (minimize GitHub round-trips)
# ---------------------------------------------------------------------------

def get_existing_json_files(lecture_name: str):
    """Return cached JSON reference list for *lecture*.

    Uses `st.session_state` to avoid hitting GitHub on every Streamlit rerun.
    The cache is automatically refreshed when:
      • user selects a different lecture (new cache key), or
      • `save_records_to_json` inserts the new file path after an explicit save.
    """

    if not lecture_name:
        return []

    key = f"json_files_{lecture_name}"
    if key in st.session_state:
        return st.session_state[key]

    # First time: fetch and cache
    files = list_json_files_for_lecture(lecture_name, names_only=False)
    st.session_state[key] = files
    return files