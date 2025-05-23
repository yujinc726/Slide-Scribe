import streamlit as st
import json
import os
import shutil
import pandas as pd
import time

# unified helpers
from utils import (
    get_user_base_dir,
    load_lecture_names,
    list_json_files_for_lecture,
    delete_lecture,
    load_records_from_json,
)
from github_storage import github_enabled, save_json, delete_json

def ensure_directory(directory):
    """디렉토리가 존재하는지 확인하고 없으면 생성"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def get_json_files_for_lecture(lecture_name):
    """특정 강의 디렉토리에서 사용 가능한 JSON 파일 목록 가져오기"""
    if not lecture_name:
        return []
    timer_logs_dir = os.path.join(get_user_base_dir(), lecture_name)
    json_files = []
    
    if os.path.exists(timer_logs_dir):
        for file_name in os.listdir(timer_logs_dir):
            if file_name.endswith('.json'):
                json_files.append(file_name)
    
    return json_files

def load_json_file(json_path):
    """JSON 파일에서 타이머 기록 로드"""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"JSON 파일 로드 중 오류: {e}")
        return []

def save_json_file(json_path, data):
    """타이머 기록을 JSON 파일로 저장"""
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        st.error(f"JSON 파일 저장 중 오류: {e}")
        return False

def manage_json_files():
    """JSON 파일 관리 기능 구현"""
    st.subheader("JSON 파일 관리")
    
    # 강의 선택
    available_lectures = load_lecture_names()
    if not available_lectures:
        st.info("등록된 강의가 없습니다.")
        return
    
    selected_lecture = st.selectbox(
        "강의 선택",
        available_lectures,
        key="lecture_selector_json",
        index=None,
        placeholder='강의를 선택해주세요'
    )
    
    if selected_lecture:
        with st.expander("로컬에서 기록 불러오기"):
            # 파일 업로더 키 초기화
            if f"uploader_key_{selected_lecture}" not in st.session_state:
                st.session_state[f"uploader_key_{selected_lecture}"] = 0
            
            # JSON 파일 업로드
            uploaded_file = st.file_uploader(
                "JSON 파일을 선택하세요",
                type=["json"],
                key=f"json_uploader_{selected_lecture}_{st.session_state[f'uploader_key_{selected_lecture}']}"
            )
            
            # 업로드된 파일을 세션 상태에 저장
            if uploaded_file is not None:
                st.session_state[f"uploaded_file_{selected_lecture}"] = {
                    "name": uploaded_file.name,
                    "content": uploaded_file.read()
                }
            else:
                # 파일 업로더가 비어 있으면 세션 상태 초기화
                st.session_state.pop(f"uploaded_file_{selected_lecture}", None)
            
            # 업로드된 기록 저장 버튼
            if st.button(
                "로컬 기록 불러오기",
                key=f"save_uploaded_file_{selected_lecture}",
                disabled=not st.session_state.get(f"uploaded_file_{selected_lecture}")
            ):
                uploaded_file_info = st.session_state[f"uploaded_file_{selected_lecture}"]
                try:
                    # JSON 파일 검증
                    json_data = json.loads(uploaded_file_info["content"])
                    if github_enabled():
                        # GitHub 저장소에 파일 업로드
                        from utils import _user_id  # 내부 함수 사용
                        if not save_json(_user_id(), selected_lecture, uploaded_file_info["name"], json_data):
                            st.error("GitHub 저장소에 파일을 저장하지 못했습니다.")
                            raise RuntimeError("GitHub save failed")
                    else:
                        # 파일 저장 경로 (로컬)
                        upload_path = os.path.join(get_user_base_dir(), selected_lecture, uploaded_file_info["name"])
                        ensure_directory(os.path.join(get_user_base_dir(), selected_lecture))
                        # JSON 파일 저장 (로컬)
                        with open(upload_path, 'w', encoding='utf-8') as f:
                            json.dump(json_data, f, ensure_ascii=False, indent=2)
                    # 성공 메시지 저장
                    st.session_state[f"upload_success_{selected_lecture}"] = f"{uploaded_file_info['name']} 파일을 불러왔습니다."
                    # 업로드 상태 초기화 및 파일 업로더 리셋
                    st.session_state.pop(f"uploaded_file_{selected_lecture}", None)
                    st.session_state[f"uploader_key_{selected_lecture}"] += 1
                except json.JSONDecodeError:
                    st.error("업로드된 파일이 유효한 JSON 형식이 아닙니다.")
                except Exception as e:
                    st.error(f"파일 저장 중 오류: {e}")
            
            # 성공 메시지 표시
            if st.session_state.get(f"upload_success_{selected_lecture}"):
                st.success(st.session_state[f"upload_success_{selected_lecture}"])
                # 메시지 표시 후 지연해서 제거
                time.sleep(2)
                st.session_state.pop(f"upload_success_{selected_lecture}", None)
        
        with st.expander("JSON 파일 관리"):
            # JSON 파일 목록 (로컬 & GitHub 모두 지원)
            json_files = list_json_files_for_lecture(selected_lecture, names_only=True)
            selected_json = st.selectbox(
                "JSON 파일 선택",
                json_files,
                key="json_selector",
                index=None,
                placeholder="JSON 파일을 선택해주세요"
            )
            
            if selected_json:
                # json reference (local path or GitHub ref)
                if github_enabled():
                    json_ref = f"github://{selected_lecture}/{selected_json}"
                else:
                    json_ref = os.path.join(get_user_base_dir(), selected_lecture, selected_json)

                # 파일 삭제와 다운로드 버튼 (JSON 파일 선택 바로 아래)
                col1, col2 = st.columns(2)
                with col1:
                    # JSON 파일 다운로드 (로컬: 직접 읽기, GitHub: utils 로드 후 dump)
                    if github_enabled():
                        json_data = load_records_from_json(json_ref)
                        file_content = json.dumps(json_data, ensure_ascii=False, indent=2)
                    else:
                        with open(json_ref, "r", encoding="utf-8") as f:
                            file_content = f.read()

                    st.download_button(
                        label="기록 다운로드",
                        data=file_content,
                        file_name=selected_json,
                        mime="application/json",
                        use_container_width=True,
                        disabled=not selected_json,
                    )

                with col2:
                    if st.button("기록 삭제", use_container_width=True, disabled=not selected_json):
                        if github_enabled():
                            from utils import _user_id  # pylint: disable=import-outside-toplevel
                            if delete_json(_user_id(), selected_lecture, selected_json):
                                st.success(f"{selected_json} 파일이 GitHub에서 삭제되었습니다.")
                                st.rerun()
                        else:
                            try:
                                os.remove(json_ref)
                                st.success(f"{selected_json} 파일이 삭제되었습니다.")
                                st.rerun()
                            except Exception as e:
                                st.error(f"파일 삭제 중 오류: {e}")
                
                # 파일 내용 불러오기
                json_data = load_records_from_json(json_ref)
                
                if not json_data:
                    st.warning("선택한 파일을 불러올 수 없거나 파일이 비어있습니다.")
                    return
                
                # 데이터프레임으로 변환
                df = pd.DataFrame(json_data)
                
                # 데이터 에디터
                st.write("기록 편집")
                edited_df = st.data_editor(
                    df,
                    num_rows="dynamic",
                    use_container_width=True,
                    key=f"json_editor_{selected_lecture}_{selected_json}",
                    column_config={
                        "slide_number": st.column_config.TextColumn("Slide Number", help="슬라이드 번호"),
                        "start_time": st.column_config.TextColumn("Start Time", help="시작 시간"),
                        "end_time": st.column_config.TextColumn("End Time", help="종료 시간"),
                        "notes": st.column_config.TextColumn("Notes", help="메모")
                    }
                )
                
                # 변경사항 저장 버튼 (데이터 에디터 아래)
                if st.button("변경사항 저장", use_container_width=True):
                    if github_enabled():
                        st.warning("GitHub 저장소의 파일은 이곳에서 직접 수정/저장할 수 없습니다.")
                    else:
                        if save_json_file(json_ref, edited_df.to_dict('records')):
                            st.success(f"{selected_json} 파일이 저장되었습니다.")
                        else:
                            st.error("파일 저장 중 오류가 발생했습니다.")

def manage_lectures():
    """강의 이름 관리 기능 구현"""
    st.subheader("강의 목록 관리")
    
    # 현재 강의 목록 (GitHub/로컬)
    available_lectures = load_lecture_names()

    with st.expander("강의 추가"):
        new_lecture = st.text_input("강의 추가", key="new_lecture_input_settings", placeholder="강의명 입력", label_visibility="collapsed")
        if st.button("강의 추가", key="add_lecture_settings"):
            if new_lecture.strip():
                if new_lecture not in available_lectures:
                    # 디렉토리 생성
                    ensure_directory(os.path.join(get_user_base_dir(), new_lecture))
                    # --- GitHub 디렉토리가 비어있으면 보이지 않는 문제 해결 ---
                    if github_enabled():
                        # 내부 함수 import 는 순환 의존성 방지를 위해 로컬에서 수행
                        from utils import _user_id  # pylint: disable=import-outside-toplevel
                        from github_storage import _get_repo  # pylint: disable=import-outside-toplevel, protected-access

                        repo = _get_repo()
                        if repo is not None:
                            placeholder_path = f"timer_logs/{_user_id()}/{new_lecture}/.gitkeep"
                            try:
                                repo.create_file(placeholder_path, f"init {new_lecture}", "")
                            except Exception:
                                # 파일이 이미 존재하거나 기타 오류 시 무시
                                pass
                    # -------------------------------------------------------
                    # invalidate cached lecture list
                    st.session_state.pop("lecture_names", None)
                    st.success(f"강의가 추가되었습니다: {new_lecture}")
                    st.rerun()
                else:
                    st.warning("이미 존재하는 강의 이름입니다.")
            else:
                st.warning("강의 이름을 입력해주세요.")

    with st.expander("강의 삭제"):
        if available_lectures:
            selected_lectures = st.multiselect(
                "강의 삭제",
                available_lectures,
                default=[],
                key="lecture_list_settings",
                placeholder="삭제할 강의 선택",
                label_visibility="collapsed"
            )
        else:
            st.info("등록된 강의가 없습니다.")
            selected_lectures = []
        if st.button("강의 삭제", key="remove_lectures_settings"):
            if selected_lectures:
                for lecture in selected_lectures:
                    # 로컬 및 GitHub 모두 삭제
                    delete_lecture(lecture)
                # invalidate cache
                st.session_state.pop("lecture_names", None)
                st.success(f"{len(selected_lectures)}개의 강의가 삭제되었습니다.")
                st.rerun()
            else:
                st.warning("삭제할 강의를 선택해주세요.")

def settings_tab():
    """Settings 탭 구현"""
    with st.container():
        manage_lectures()
    st.divider()
    with st.container():
        manage_json_files()