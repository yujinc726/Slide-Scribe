class SlideScribeApp {
    constructor() {
        this.activeTab = 'home';
        this.currentStep = 'lecture-selection';
        this.timerState = {
            isRunning: false,
            baseTime: 0,  // 기준 시간 (밀리초)
            pausedTime: 0,  // 일시정지된 누적 시간
            lastStartTime: null,  // 마지막 시작 시간
            currentSlide: 1,  // 현재 슬라이드 번호
            sessionStartTime: '00:00:00.000'  // 세션 시작 시간
        };
        
        this.slides = [];
        this.timerInterval = null;

        // SRT Parser state
        this.srtParser = {
            selectedLecture: null,
            selectedRecord: null,
            selectedFile: null,
            currentStep: 'lecture'
        };
        
        // Settings state
        this.settingsState = {
            selectedLecture: null,
            currentEditingFile: null,
            currentEditingData: null
        };
        
        // Home state - 추가
        this.homeState = {
            selectedJsonLecture: null,
            selectedJsonFile: null
        };

        this.srtParserState = {
            selectedLecture: null,
            selectedRecord: null,
            timerData: null,
            srtData: null,
            step: 'lecture'
        };

        this.userState = {
            isLoggedIn: false,
            currentUser: null
        };

        this.toasts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkLoginStatus();
        this.loadSidebarState();
        this.switchTab('home');
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = item.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Timer tab listeners
        this.setupTimerListeners();
        
        // Transcriber tab listeners
        this.setupTranscriberListeners();
        
        // SRT Parser tab listeners
        this.setupSrtParserListeners();
        
        // Home tab listeners
        this.setupHomeListeners();
        
        // Settings tab listeners
        this.setupSettingsListeners();

        // Modal listeners
        this.setupModalListeners();
    }

    setupTimerListeners() {
        // Lecture selection
        const lectureSelect = document.getElementById('lectureSelect');
        if (lectureSelect) {
            lectureSelect.addEventListener('change', (e) => {
                const lectureName = e.target.value;
                this.onLectureSelectChange(lectureName);
                
                const selectBtn = document.getElementById('selectLectureBtn');
                if (selectBtn) {
                    selectBtn.disabled = !lectureName;
                }
            });
        }

        const selectLectureBtn = document.getElementById('selectLectureBtn');
        if (selectLectureBtn) {
            selectLectureBtn.addEventListener('click', () => {
                this.proceedToRecordSelection();
            });
        }

        // Record selection
        const recordSelect = document.getElementById('recordSelect');
        if (recordSelect) {
            recordSelect.addEventListener('change', (e) => {
                const recordFile = e.target.value;
                this.onRecordSelectChange(recordFile);
                
                const selectBtn = document.getElementById('selectRecordBtn');
                if (selectBtn) {
                    selectBtn.disabled = !recordFile;
                }
            });
        }

        const selectRecordBtn = document.getElementById('selectRecordBtn');
        if (selectRecordBtn) {
            selectRecordBtn.addEventListener('click', () => {
                this.proceedToTimer();
            });
        }

        // Timer controls
        const startStopBtn = document.getElementById('startStopBtn');
        if (startStopBtn) {
            startStopBtn.addEventListener('click', () => {
                this.toggleTimer();
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetTimer();
            });
        }

        const recordSlideBtn = document.getElementById('recordSlideBtn');
        if (recordSlideBtn) {
            recordSlideBtn.addEventListener('click', () => {
                this.recordSlide();
            });
        }

        const saveRecordsBtn = document.getElementById('saveRecordsBtn');
        if (saveRecordsBtn) {
            saveRecordsBtn.addEventListener('click', () => {
                this.saveRecords();
            });
        }

        const exportRecordsBtn = document.getElementById('exportRecordsBtn');
        if (exportRecordsBtn) {
            exportRecordsBtn.addEventListener('click', () => {
                this.exportRecords();
            });
        }

        const clearRecordsBtn = document.getElementById('clearRecordsBtn');
        if (clearRecordsBtn) {
            clearRecordsBtn.addEventListener('click', () => {
                this.clearRecords();
            });
        }

        // Slide number increment
        const slideNumber = document.getElementById('slideNumber');
        if (slideNumber) {
            slideNumber.addEventListener('input', (e) => {
                this.timerState.currentSlide = parseInt(e.target.value) || 1;
            });
        }
    }

    setupTranscriberListeners() {
        // Audio file upload
        const audioUpload = document.getElementById('audioUpload');
        const audioFileInput = document.getElementById('audioFileInput');
        
        if (audioUpload && audioFileInput) {
            audioUpload.addEventListener('click', () => {
                audioFileInput.click();
            });
            
            audioUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                audioUpload.classList.add('dragover');
            });
            
            audioUpload.addEventListener('dragleave', () => {
                audioUpload.classList.remove('dragover');
            });
            
            audioUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                audioUpload.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleAudioUpload(files[0]);
                }
            });
            
            audioFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleAudioUpload(e.target.files[0]);
                }
            });
        }

        // Start transcription
        const startTranscriptionBtn = document.getElementById('startTranscriptionBtn');
        if (startTranscriptionBtn) {
            startTranscriptionBtn.addEventListener('click', () => {
                this.startTranscription();
            });
        }
    }

    setupSrtParserListeners() {
        // Lecture selection
        const parserLectureSelect = document.getElementById('parserLectureSelect');
        if (parserLectureSelect) {
            parserLectureSelect.addEventListener('change', (e) => {
                const lectureName = e.target.value;
                this.onParserLectureSelectChange(lectureName);
                
                const selectBtn = document.getElementById('selectParserLectureBtn');
                if (selectBtn) {
                    selectBtn.disabled = !lectureName;
                }
            });
        }
        
        const selectParserLectureBtn = document.getElementById('selectParserLectureBtn');
        if (selectParserLectureBtn) {
            selectParserLectureBtn.addEventListener('click', () => {
                this.proceedToParserRecordSelection();
            });
        }
        
        // Record selection
        const parserRecordSelect = document.getElementById('parserRecordSelect');
        if (parserRecordSelect) {
            parserRecordSelect.addEventListener('change', (e) => {
                const recordFile = e.target.value;
                this.onParserRecordSelectChange(recordFile);
                
                const selectBtn = document.getElementById('selectParserRecordBtn');
                if (selectBtn) {
                    selectBtn.disabled = !recordFile;
                }
            });
        }
        
        const selectParserRecordBtn = document.getElementById('selectParserRecordBtn');
        if (selectParserRecordBtn) {
            selectParserRecordBtn.addEventListener('click', () => {
                this.proceedToSrtFileUpload();
            });
        }
        
        // SRT File Upload
        const srtFileInput = document.getElementById('srtFileInput');
        const srtUploadArea = document.getElementById('srtUploadArea');
        const uploadSrtBtn = document.getElementById('uploadSrtBtn');
        
        if (srtFileInput) {
            srtFileInput.addEventListener('change', (e) => this.handleSrtFileSelect(e));
        }
        
        if (srtUploadArea) {
            // Click to browse files
            srtUploadArea.addEventListener('click', () => {
                if (srtFileInput) {
                    srtFileInput.click();
                }
            });
            
            // Drag and drop events
            srtUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                srtUploadArea.classList.add('drag-over');
            });
            
            srtUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                srtUploadArea.classList.remove('drag-over');
            });
            
            srtUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                srtUploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleSrtFileSelect({ target: { files } });
                }
            });
        }
        
        if (uploadSrtBtn) {
            uploadSrtBtn.addEventListener('click', () => {
                this.proceedToParserInterface();
            });
        }
        
        // Parse files button
        const parseFilesBtn = document.getElementById('parseFilesBtn');
        if (parseFilesBtn) {
            parseFilesBtn.addEventListener('click', () => {
                this.parseFiles();
            });
        }
        
        // Export results button
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        if (exportResultsBtn) {
            exportResultsBtn.addEventListener('click', () => {
                this.exportSrtResults();
            });
        }
    }

    // ===== Tab Management =====
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.activeTab = tabName;
        
        // Initialize tabs as needed
        if (tabName === 'timer') {
            this.initializeTimerTab();
        } else if (tabName === 'parser') {
            this.initializeSrtParserTab();
        } else if (tabName === 'home') {
            this.initializeHomeTab();
        } else if (tabName === 'settings') {
            this.initializeSettingsTab().catch(error => {
                console.error('Settings tab initialization failed:', error);
            });
        }
    }

    initializeTimerTab() {
        // Reset to initial state if not already set up
        // 타이머가 이미 실행 중이거나 설정된 상태가 아닐 때만 리셋
        if (this.currentStep !== 'timer' && !this.timerState.isRunning && this.timerState.pausedTime === 0) {
            this.resetToLectureSelection();
        }
        
        // 타이머가 이미 설정되어 있다면 현재 상태 유지
        if (this.currentStep === 'timer') {
            // 타이머 디스플레이 업데이트
            this.updateTimerDisplay();
            this.updateTimerButton();
        }
    }

    initializeHomeTab() {
        // Home 탭 초기화 - 통계 업데이트
        this.updateHomeStats();
    }

    async initializeSettingsTab() {
        this.loadPreferences();
        
        // 사용자가 로그인한 경우에만 강의 관리 섹션 표시
        if (this.userState.isLoggedIn) {
            await this.initializeLectureManagement();
        } else {
            this.hideLectureManagement();
        }
    }

    async initializeLectureManagement() {
        const lectureManagementCard = document.getElementById('lectureManagementCard');
        if (lectureManagementCard) {
            lectureManagementCard.style.display = 'block';
        }

        // GitHub 동기화 상태 확인
        await this.checkSyncStatus();
        
        // 사용자 강의 목록 로드
        await this.loadUserLectures();
    }

    hideLectureManagement() {
        const lectureManagementCard = document.getElementById('lectureManagementCard');
        if (lectureManagementCard) {
            lectureManagementCard.style.display = 'none';
        }
    }

    async checkSyncStatus() {
        const syncIndicator = document.getElementById('syncIndicator');
        const syncStatus = document.getElementById('syncStatus');
        
        if (!syncIndicator || !syncStatus) return;

        try {
            // 연결 확인 중 상태 표시
            syncIndicator.className = 'sync-indicator checking';
            syncStatus.textContent = '연결 확인 중...';

            const response = await fetch(`/api/users/${this.userState.currentUser.username}/sync-status`);
            const data = await response.json();

            if (data.github_configured && data.github_connected) {
                syncIndicator.className = 'sync-indicator connected';
                syncStatus.textContent = 'GitHub 동기화 활성화';
            } else if (data.github_configured) {
                syncIndicator.className = 'sync-indicator disconnected';
                syncStatus.textContent = 'GitHub 연결 오류';
            } else {
                syncIndicator.className = 'sync-indicator disconnected';
                syncStatus.textContent = 'GitHub 미설정 (로컬 백업만)';
            }
        } catch (error) {
            console.error('Sync status check failed:', error);
            syncIndicator.className = 'sync-indicator disconnected';
            syncStatus.textContent = '연결 상태 확인 실패';
        }
    }

    async loadUserLectures() {
        const userLectureList = document.getElementById('userLectureList');
        if (!userLectureList) return;

        try {
            // 로딩 상태 표시
            userLectureList.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    강의 목록을 불러오는 중...
                </div>
            `;

            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures`);
            const data = await response.json();

            const lectures = data.lectures || [];

            if (lectures.length === 0) {
                userLectureList.innerHTML = `
                    <div class="empty-lectures">
                        <i class="fas fa-book-open"></i>
                        <p>아직 생성된 강의가 없습니다</p>
                        <small>새 강의를 추가하여 시작해보세요</small>
                    </div>
                `;
                return;
            }

            // 강의 목록 렌더링
            userLectureList.innerHTML = lectures.map(lecture => this.renderLectureItem(lecture)).join('');

            // 강의 액션 버튼 이벤트 리스너 추가
            this.attachLectureEventListeners();

        } catch (error) {
            console.error('Failed to load user lectures:', error);
            userLectureList.innerHTML = `
                <div class="empty-lectures">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>강의 목록을 불러올 수 없습니다</p>
                    <small>네트워크 연결을 확인해주세요</small>
                </div>
            `;
        }
    }

    renderLectureItem(lecture) {
        const createdDate = new Date(lecture.created_at).toLocaleDateString('ko-KR');
        const timerRecordsCount = lecture.timer_records ? lecture.timer_records.length : 0;
        
        return `
            <div class="lecture-item" data-lecture-id="${lecture.id}">
                <div class="lecture-info">
                    <h4 class="lecture-name">${this.escapeHtml(lecture.name)}</h4>
                    <div class="lecture-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${createdDate}</span>
                        <span><i class="fas fa-clock"></i> ${timerRecordsCount}개 기록</span>
                        <span><i class="fas fa-tag"></i> ID: ${lecture.id.slice(0, 8)}</span>
                    </div>
                </div>
                <div class="lecture-actions">
                    <button class="btn-lecture-action btn-lecture-edit" 
                            onclick="window.app.editLecture('${lecture.id}')" 
                            title="강의 편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-lecture-action btn-lecture-delete" 
                            onclick="window.app.deleteLecture('${lecture.id}', '${this.escapeHtml(lecture.name)}')" 
                            title="강의 삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachLectureEventListeners() {
        // 이벤트 위임을 통해 동적으로 생성된 요소에 이벤트 리스너 추가
        const userLectureList = document.getElementById('userLectureList');
        if (!userLectureList) return;

        userLectureList.addEventListener('click', (e) => {
            const target = e.target.closest('.btn-lecture-action');
            if (!target) return;

            const lectureItem = target.closest('.lecture-item');
            const lectureId = lectureItem?.dataset.lectureId;
            
            if (!lectureId) return;

            if (target.classList.contains('btn-lecture-edit')) {
                this.editLecture(lectureId);
            } else if (target.classList.contains('btn-lecture-delete')) {
                const lectureName = lectureItem.querySelector('.lecture-name')?.textContent || '';
                this.deleteLecture(lectureId, lectureName);
            }
        });
    }

    async handleAddLecture() {
        const nameInput = document.getElementById('newLectureName');
        const addBtn = document.getElementById('addLectureBtn');

        if (!nameInput || !this.userState.isLoggedIn) return;

        const name = nameInput.value.trim();

        if (!name) {
            this.showToast('강의명을 입력해주세요', 'warning');
            nameInput.focus();
            return;
        }

        try {
            // 버튼 로딩 상태
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추가 중...';

            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(result.message, 'success');
                
                // 입력 필드 초기화
                nameInput.value = '';
                
                // 강의 목록 새로고침
                await this.loadUserLectures();
            } else {
                this.showToast(result.detail || '강의 생성에 실패했습니다', 'error');
            }
        } catch (error) {
            console.error('Add lecture error:', error);
            this.showToast('강의 생성 중 오류가 발생했습니다', 'error');
        } finally {
            // 버튼 상태 복원
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="fas fa-plus"></i> 추가';
        }
    }

    async deleteLecture(lectureId, lectureName) {
        if (!confirm(`"${lectureName}" 강의를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures/${lectureId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast(result.message, 'success');
                await this.loadUserLectures();
            } else {
                this.showToast(result.detail || '강의 삭제에 실패했습니다', 'error');
            }
        } catch (error) {
            console.error('Delete lecture error:', error);
            this.showToast('강의 삭제 중 오류가 발생했습니다', 'error');
        }
    }

    async editLecture(lectureId) {
        // 향후 구현할 강의 편집 기능
        this.showToast('강의 편집 기능은 곧 추가될 예정입니다', 'info');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Timer Logic =====
    toggleTimer() {
        if (this.timerState.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        const startTimeInput = document.getElementById('startTime');
        const startTimeValue = startTimeInput.value;
        
        // 시작 시간 포맷 검증
        const startTimeMs = this.parseTime(startTimeValue);
        if (startTimeMs === null) {
            this.showToast('Invalid start time format. Use HH:MM:SS.mmm', 'error');
            return;
        }

        // 타이머 상태 업데이트
        this.timerState.isRunning = true;
        this.timerState.lastStartTime = Date.now();
        
        // 처음 시작하는 경우 또는 시작 시간이 변경된 경우
        if (this.timerState.pausedTime === 0 || this.timerState.baseTime !== startTimeMs) {
            this.timerState.baseTime = startTimeMs;
            this.timerState.pausedTime = 0;
        }
        
        // UI 업데이트
        this.updateTimerButton();
        this.updateTimerStatus('Timer Running');
        this.disableStartTimeInput();
        
        // 타이머 디스플레이 시작
        this.startTimerDisplay();
        
        // 즉시 디스플레이 업데이트
        this.updateTimerDisplay();
        
        this.showToast('Timer started', 'success');
    }

    pauseTimer() {
        if (!this.timerState.isRunning) return;
        
        // 현재까지의 실행 시간을 누적
        if (this.timerState.lastStartTime) {
            this.timerState.pausedTime += Date.now() - this.timerState.lastStartTime;
        }
        
        // 타이머 상태 업데이트
        this.timerState.isRunning = false;
        this.timerState.lastStartTime = null;
        
        // 현재 시간을 계산하여 시작 시간 입력 필드 업데이트
        const currentTotalTime = this.timerState.baseTime + this.timerState.pausedTime;
        document.getElementById('startTime').value = this.formatTime(currentTotalTime);
        
        // UI 업데이트
        this.updateTimerButton();
        this.updateTimerStatus('Timer Paused');
        this.enableStartTimeInput();
        
        // 타이머 디스플레이 중지
        this.stopTimerDisplay();
        
        this.showToast('Timer paused', 'warning');
    }

    resetTimer() {
        // 타이머 완전 초기화
        this.timerState.isRunning = false;
        this.timerState.baseTime = 0;
        this.timerState.pausedTime = 0;
        this.timerState.lastStartTime = null;
        
        // 시작 시간 입력 필드 초기화
        document.getElementById('startTime').value = '00:00:00.000';
        
        // 슬라이드 데이터 초기화
        this.slides = [];
        this.updateSlidesTable();
        this.updateRecordCount();
        
        // 슬라이드 번호 초기화
        document.getElementById('slideNumber').value = 1;
        
        // 폼 초기화
        document.getElementById('slideTitle').value = '';
        document.getElementById('slideNotes').value = '';
        
        // UI 업데이트
        this.updateTimerButton();
        this.updateTimerStatus('Ready to Start');
        this.enableStartTimeInput();
        this.updateTimerDisplay();
        
        // 타이머 디스플레이 중지
        this.stopTimerDisplay();
        
        this.showToast('Timer reset', 'success');
    }

    startTimerDisplay() {
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 10); // Update every 10ms for smooth display
    }

    stopTimerDisplay() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        // 현재 총 시간 계산
        let totalTime = this.timerState.baseTime + this.timerState.pausedTime;
        
        // 타이머가 실행 중이면 현재 실행 시간도 추가
        if (this.timerState.isRunning && this.timerState.lastStartTime) {
            totalTime += Date.now() - this.timerState.lastStartTime;
        }
        
        // 타이머 디스플레이 업데이트
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = this.formatTime(totalTime);
        }
    }

    updateTimerButton() {
        const btn = document.getElementById('startStopBtn');
        if (!btn) return;
        
        if (this.timerState.isRunning) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        } else {
            // 일시정지된 시간이 있으면 Resume, 없으면 Start
            const isResuming = this.timerState.pausedTime > 0;
            btn.innerHTML = `<i class="fas fa-play"></i> ${isResuming ? 'Resume' : 'Start'}`;
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }
    }

    updateTimerStatus(status) {
        const statusEl = document.getElementById('timerStatus');
        if (statusEl) {
            statusEl.textContent = status;
        }
        
        // Update timer section classes for styling
        const timerSection = document.querySelector('.timer-section');
        if (timerSection) {
            timerSection.classList.remove('timer-running', 'timer-paused');
            
            if (status === 'Timer Running') {
                timerSection.classList.add('timer-running');
            } else if (status === 'Timer Paused') {
                timerSection.classList.add('timer-paused');
            }
        }
    }

    disableStartTimeInput() {
        document.getElementById('startTime').disabled = true;
    }

    enableStartTimeInput() {
        document.getElementById('startTime').disabled = false;
    }

    // ===== Slide Recording =====
    recordSlide() {
        if (!this.currentLecture) {
            this.showToast('Please select a lecture first', 'error');
            return;
        }

        const slideTitle = document.getElementById('slideTitle').value.trim();
        const slideNumber = document.getElementById('slideNumber').value;
        const notes = document.getElementById('slideNotes').value.trim();

        // 현재 총 시간 계산 (새로운 방식)
        let currentTime = this.timerState.baseTime + this.timerState.pausedTime;
        if (this.timerState.isRunning && this.timerState.lastStartTime) {
            currentTime += Date.now() - this.timerState.lastStartTime;
        }
        
        const endTime = this.formatTime(currentTime);
        
        // 첫 번째 슬라이드의 경우 또는 이전 슬라이드가 없는 경우 기준 시간을 시작 시간으로 사용
        let startTime;
        if (this.slides.length === 0) {
            startTime = this.formatTime(this.timerState.baseTime);
        } else {
            // 이전 슬라이드의 종료 시간을 시작 시간으로 사용
            startTime = this.slides[this.slides.length - 1].end_time;
        }

        // 슬라이드 레코드 생성
        const slide = {
            slide_title: slideTitle,
            slide_number: slideNumber,
            start_time: startTime,
            end_time: endTime,
            notes: notes
        };

        this.slides.push(slide);
        
        // 다음 슬라이드를 위한 업데이트
        document.getElementById('slideNumber').value = parseInt(slideNumber) + 1;
        document.getElementById('slideNotes').value = '';

        // UI 업데이트
        this.updateSlidesTable();
        this.updateRecordCount();
        
        this.showToast(`Slide ${slideNumber} recorded`, 'success');
    }

    updateSlidesTable() {
        const tbody = document.getElementById('slidesTableBody');
        
        if (this.slides.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" class="text-center">
                        <div class="empty-state-inline">
                            <i class="fas fa-clock"></i>
                            <span>No slides recorded yet</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.slides.map((slide, index) => {
            return `
                <tr data-slide-index="${index}">
                    <td class="editable" data-field="slide_title" data-index="${index}">
                        ${slide.slide_title || 'Untitled'}
                    </td>
                    <td class="editable" data-field="slide_number" data-index="${index}">
                        ${slide.slide_number || '-'}
                        <i class="fas fa-pencil-alt edit-indicator"></i>
                    </td>
                    <td class="editable" data-field="start_time" data-index="${index}">
                        ${slide.start_time || '-'}
                        <i class="fas fa-pencil-alt edit-indicator"></i>
                    </td>
                    <td class="editable" data-field="end_time" data-index="${index}">
                        ${slide.end_time || '-'}
                        <i class="fas fa-pencil-alt edit-indicator"></i>
                    </td>
                    <td class="editable notes-with-delete" data-field="notes" data-index="${index}">
                        <span class="notes-text">${(slide.notes || '').replace(/\n/g, '<br>')}</span>
                        <i class="fas fa-pencil-alt edit-indicator"></i>
                    </td>
                    <td class="delete-cell">
                        <button class="btn-delete-slide" onclick="app.deleteSlide(${index})" title="Delete slide">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add click listeners for editable cells
        const editableCells = document.querySelectorAll('.data-table td.editable');
        
        editableCells.forEach((cell) => {
            // 기본 클릭 이벤트
            cell.addEventListener('click', (e) => {
                // 클릭된 요소가 셀 내부의 어떤 요소든 상관없이 해당 셀을 편집 모드로 전환
                const targetCell = e.target.closest('td.editable');
                if (targetCell) {
                    this.startInlineEdit(targetCell);
                }
            });
        });
    }

    deleteSlide(index) {
        this.slides.splice(index, 1);
        this.updateSlidesTable();
        this.updateRecordCount();
        this.showToast('Slide record deleted', 'success');
    }

    startInlineEdit(cell) {
        // Check if another cell is already being edited
        const existingEdit = document.querySelector('.data-table td.editing');
        if (existingEdit && existingEdit !== cell) {
            this.cancelInlineEdit(existingEdit);
        }

        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        
        // 추가 검증
        if (!field || isNaN(index) || !this.slides[index]) {
            return;
        }
        
        const currentValue = this.slides[index][field] || '';
        
        // Store original value
        cell.dataset.originalValue = currentValue;
        
        // Create input element
        const input = document.createElement(field === 'notes' ? 'textarea' : 'input');
        input.className = 'edit-input';
        
        // textarea에는 type 속성이 없으므로 input일 때만 설정
        if (field !== 'notes') {
            input.type = field === 'slide_number' ? 'number' : 'text';
        }
        
        input.value = currentValue === '-' ? '' : currentValue;
        
        if (field === 'notes') {
            input.rows = 2;
        }
        
        // Create control buttons
        const controls = document.createElement('div');
        controls.className = 'edit-controls';
        controls.innerHTML = `
            <button class="btn btn-success btn-sm save-edit">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-secondary btn-sm cancel-edit">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Replace cell content
        cell.classList.add('editing');
        cell.innerHTML = '';
        cell.appendChild(input);
        cell.appendChild(controls);
        
        // Focus input and select text
        input.focus();
        if (field === 'notes') {
            // For textarea, position cursor at the end
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (input.type === 'text') {
            input.select();
        }
        
        // Event listeners
        input.addEventListener('keydown', (e) => {
            if (field === 'notes') {
                // For notes (textarea), save on Ctrl+Enter
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.saveInlineEdit(cell, input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelInlineEdit(cell);
                }
                // Allow normal Enter for line breaks in textarea
            } else {
                // For other fields, save on Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.saveInlineEdit(cell, input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelInlineEdit(cell);
                }
            }
        });
        
        // Prevent click events from bubbling up from input and controls
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        controls.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        controls.querySelector('.save-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveInlineEdit(cell, input.value);
        });
        
        controls.querySelector('.cancel-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelInlineEdit(cell);
        });
        
        // Improved click outside to cancel - only for non-editing areas
        this.currentClickHandler = (e) => {
            // Don't trigger if clicking within the current editing cell
            if (cell.contains(e.target)) {
                return;
            }
            
            // Only trigger if clicking completely outside the table or on another editable cell
            const clickedCell = e.target.closest('td.editable');
            if (clickedCell && clickedCell !== cell) {
                // Clicking on another editable cell - save current and start editing the new one
                this.saveInlineEdit(cell, input.value);
            } else if (!e.target.closest('.data-table')) {
                // Clicking completely outside the table - cancel edit
                this.cancelInlineEdit(cell);
            }
        };
        
        // Add slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener('click', this.currentClickHandler);
        }, 150);
    }

    saveInlineEdit(cell, newValue) {
        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        const originalValue = cell.dataset.originalValue;
        
        // Validate input
        if (field === 'slide_number' && newValue && isNaN(newValue)) {
            this.showToast('Slide number must be a valid number', 'error');
            return;
        }
        
        if (field === 'start_time' || field === 'end_time') {
            if (newValue && this.parseTime(newValue) === null) {
                this.showToast('Invalid time format. Use HH:MM:SS.mmm', 'error');
                return;
            }
        }
        
        // Update slide data
        this.slides[index][field] = newValue || '';
        
        // Show success message if value changed
        if (newValue !== originalValue) {
            this.showToast(`${field.replace('_', ' ')} updated`, 'success');
        }
        
        // Clean up click handler
        document.removeEventListener('click', this.currentClickHandler);
        this.currentClickHandler = null;
        
        // Restore cell
        this.restoreCell(cell, newValue || '-');
    }

    cancelInlineEdit(cell) {
        const originalValue = cell.dataset.originalValue;
        
        // Clean up click handler
        document.removeEventListener('click', this.currentClickHandler);
        this.currentClickHandler = null;
        
        this.restoreCell(cell, originalValue === '' ? '-' : originalValue);
    }

    restoreCell(cell, displayValue) {
        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        
        cell.classList.remove('editing');
        
        if (field === 'notes') {
            cell.innerHTML = `
                <span class="notes-text">${displayValue}</span>
                <i class="fas fa-pencil-alt edit-indicator"></i>
            `;
        } else {
            cell.innerHTML = `
                ${displayValue}
                <i class="fas fa-pencil-alt edit-indicator"></i>
            `;
        }
        
        // Re-add click listener
        cell.addEventListener('click', (e) => this.startInlineEdit(cell));
    }

    updateRecordCount() {
        document.getElementById('recordCount').textContent = `${this.slides.length} slides recorded`;
    }

    clearRecords() {
        if (this.slides.length === 0) {
            this.showToast('No records to clear', 'warning');
            return;
        }

        if (confirm('Are you sure you want to clear all slide records?')) {
            this.slides = [];
            this.updateSlidesTable();
            this.updateRecordCount();
            this.showToast('All records cleared', 'success');
        }
    }

    // ===== File Operations =====
    async saveRecords() {
        if (!this.timerState.currentLecture) {
            this.showToast('강의를 먼저 선택해주세요', 'warning');
            return;
        }

        if (this.slides.length === 0) {
            this.showToast('저장할 기록이 없습니다', 'warning');
            return;
        }

        // 로그인 상태 확인
        if (!this.userState.isLoggedIn) {
            this.showToast('로그인이 필요합니다', 'warning');
            return;
        }

        try {
            const sessionName = this.timerState.currentLectureName || 'Unknown Lecture';
            
            // 현재 시간으로 기록 이름 생성
            const timestamp = new Date();
            const recordName = `${sessionName}_${timestamp.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}`;
            
            // 슬라이드 데이터 유효성 검사 및 정규화
            const validatedSlides = this.slides.map((slide, index) => {
                const validatedSlide = {
                    slide_title: String(slide.slide_title || `슬라이드 ${index + 1}`).trim(),
                    slide_number: slide.slide_number ? String(slide.slide_number) : String(index + 1),
                    start_time: String(slide.start_time || '00:00:00.000'),
                    end_time: String(slide.end_time || '00:00:00.000'),
                    notes: String(slide.notes || '').trim()
                };
                
                console.log(`슬라이드 ${index + 1} 유효성 검사:`, {
                    원본: slide,
                    검증된것: validatedSlide
                });
                
                return validatedSlide;
            });
            
            // 전송할 데이터 준비
            const requestData = {
                session_name: String(recordName).trim(),
                records: validatedSlides
            };
            
            // 디버깅을 위한 로깅 추가
            console.log('=== saveRecords 디버깅 정보 ===');
            console.log('강의 ID:', this.timerState.currentLecture);
            console.log('사용자명:', this.userState.currentUser.username);
            console.log('전송할 데이터:', JSON.stringify(requestData, null, 2));
            console.log('슬라이드 개수:', validatedSlides.length);
            console.log('슬라이드 샘플:', validatedSlides.slice(0, 2));
            
            // URL 유효성 검사
            const url = `/api/users/${this.userState.currentUser.username}/lectures/${this.timerState.currentLecture}/timer-records`;
            console.log('요청 URL:', url);
            
            // GitHub API를 통해 저장
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('응답 상태:', response.status);
            console.log('응답 헤더:', response.headers);
            
            // 응답이 JSON이 아닐 수도 있으므로 텍스트로 먼저 읽어보기
            const responseText = await response.text();
            console.log('응답 텍스트:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
                throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText.slice(0, 200)}`);
            }
            
            console.log('응답 데이터:', data);

            if (data.success) {
                this.showToast(`기록이 성공적으로 저장되었습니다 (${validatedSlides.length}개 슬라이드)`, 'success');
                
                // 기록 목록 새로고침
                await this.loadRecords();
            } else {
                throw new Error(data.error || data.message || '저장 실패');
            }
        } catch (error) {
            console.error('Error saving records:', error);
            this.showToast('기록 저장 실패: ' + error.message, 'error');
        }
    }

    async exportRecords() {
        if (this.slides.length === 0) {
            this.showToast('No records to export', 'warning');
            return;
        }

        const data = {
            lecture: this.currentLecture,
            exported_at: new Date().toISOString(),
            records: this.slides
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentLecture}_slides_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Records exported successfully', 'success');
    }

    // ===== API Operations =====
    async loadLectures() {
        try {
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }

            // GitHub API에서 강의 목록 로드
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures`);
            const data = await response.json();
            
            const lectures = data.lectures || [];
            const lectureSelect = document.getElementById('lectureSelect');
            
            if (lectureSelect) {
                lectureSelect.innerHTML = '<option value="">강의를 선택하세요...</option>';
                lectures.forEach(lecture => {
                    const option = document.createElement('option');
                    option.value = lecture.id;
                    option.textContent = lecture.name;
                    option.dataset.lectureName = lecture.name;
                    lectureSelect.appendChild(option);
                });
            }
            
            if (lectures.length === 0) {
                this.showToast('생성된 강의가 없습니다. Settings에서 강의를 추가해주세요.', 'info');
            }
        } catch (error) {
            console.error('Error loading lectures:', error);
            this.showToast('강의 목록 로드 실패', 'error');
        }
    }

    async onLectureSelectChange(lectureId) {
        const lectureSelect = document.getElementById('lectureSelect');
        const selectedOption = lectureSelect.selectedOptions[0];
        const lectureName = selectedOption ? selectedOption.dataset.lectureName : '';
        
        this.currentLecture = lectureId; // 강의 ID 사용
        this.timerState.currentLecture = lectureId; // 강의 ID 사용
        this.timerState.currentLectureName = lectureName; // 강의명 저장
        
        const selectBtn = document.getElementById('selectLectureBtn');
        selectBtn.disabled = !lectureId;
        
        if (lectureId) {
            this.loadRecords(); // Load records for this lecture
        }
    }

    async loadRecords() {
        if (!this.timerState.currentLecture) {
            this.clearRecordSelect();
            return;
        }

        try {
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }

            // GitHub API에서 해당 강의의 기록들을 로드
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures/${this.timerState.currentLecture}/timer-records`);
            const data = await response.json();
            
            const records = data.records || [];
            const recordSelect = document.getElementById('recordSelect');
            recordSelect.innerHTML = '<option value="new">새 기록 시작</option>';
            
            records.forEach(record => {
                const option = document.createElement('option');
                option.value = record.id;
                option.textContent = record.session_name || `기록 ${record.id.slice(0, 8)}`;
                recordSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load records:', error);
            this.showToast('타이머 기록 로드 실패', 'error');
        }
    }

    async onRecordSelectChange(recordFile) {
        this.currentRecord = recordFile;
        this.timerState.currentRecord = recordFile; // Sync with timer state
        
        // Always enable the button since "new" is a valid option
        const selectBtn = document.getElementById('selectRecordBtn');
        if (selectBtn) {
            selectBtn.disabled = false;
        }
    }

    async loadRecordContent(recordId) {
        try {
            console.log('=== loadRecordContent ===');
            console.log(`Loading record "${recordId}" for lecture "${this.timerState.currentLecture}"`);
            
            if (!this.timerState.currentLecture) {
                throw new Error('No lecture selected');
            }
            
            // Handle "new" record case - don't try to load anything
            if (recordId === 'new') {
                console.log('Starting new session - no content to load');
                this.slides = [];
                this.timerState.slides = [];
                this.timerState.currentRecord = recordId;
                this.updateSlidesTable();
                this.updateRecordCount();
                return;
            }
            
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }
            
            // GitHub API에서 기록 내용 로드
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures/${this.timerState.currentLecture}/timer-records/${recordId}`);
            const data = await response.json();
            
            if (data.success && data.record && data.record.records) {
                console.log(`Loaded ${data.record.records.length} slides from GitHub`);
                this.slides = data.record.records;
                this.timerState.slides = [...this.slides];
                this.timerState.currentRecord = recordId;
                this.updateSlidesTable();
                this.updateRecordCount();
                this.showToast(`기록 "${data.record.session_name}" 로드됨 (${recordData.length}개 슬라이드)`, 'success');
                console.log('Record loaded successfully:', recordData);
            } else {
                throw new Error('기록을 찾을 수 없습니다');
            }
        } catch (error) {
            console.error('Error loading record content:', error);
            this.showToast(`기록 로드 실패: ${error.message}`, 'error');
        }
    }

    clearRecordSelect() {
        const select = document.getElementById('recordSelect');
        select.innerHTML = '<option value="new">새 기록 시작</option>';
    }

    async addLecture() {
        // Redirect to home tab method
        await this.addLectureFromHome();
    }

    // ===== Utility Functions =====
    parseTime(timeStr) {
        const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
        if (!match) return null;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const milliseconds = parseInt(match[4]);
        
        return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor(ms % 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    validateStartTime(timeStr) {
        if (this.parseTime(timeStr) === null) {
            this.showToast('Invalid time format. Use HH:MM:SS.mmm', 'error');
            document.getElementById('startTime').value = this.timerState.sessionStartTime;
        }
    }

    // ===== UI Helper Functions =====
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const mainContainer = document.querySelector('.main-container');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar && mainContainer && sidebarToggle) {
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand sidebar
                sidebar.classList.remove('collapsed');
                mainContainer.classList.remove('sidebar-collapsed');
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
                localStorage.setItem('sidebarCollapsed', 'false');
            } else {
                // Collapse sidebar
                sidebar.classList.add('collapsed');
                mainContainer.classList.add('sidebar-collapsed');
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
                localStorage.setItem('sidebarCollapsed', 'true');
            }
        }
    }

    // Load sidebar state from localStorage
    loadSidebarState() {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (isCollapsed) {
            const sidebar = document.querySelector('.sidebar');
            const mainContainer = document.querySelector('.main-container');
            
            if (sidebar && mainContainer && sidebarToggle) {
                sidebar.classList.add('collapsed');
                mainContainer.classList.add('sidebar-collapsed');
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
            }
        } else {
            if (sidebarToggle) {
                sidebarToggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto hide after 3 seconds
        setTimeout(() => this.hideToast(toast), 3000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => this.hideToast(toast));
    }

    hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // ===== Modal Functions =====
    openModal() {
        document.getElementById('loginModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('loginModal').classList.remove('show');
    }

    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-auth-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Form`).classList.add('active');
    }

    // ===== Settings =====
    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('darkMode', 'false');
        }
    }

    // ===== App Lifecycle =====
    destroy() {
        this.stopTimerDisplay();
    }

    // ===== Step Management =====
    async proceedToRecordSelection() {
        if (!this.currentLecture) return;
        
        // Sync both lecture variables
        this.timerState.currentLecture = this.currentLecture;
        
        // Update selection info
        document.getElementById('selectedLecture').textContent = this.currentLecture;
        
        // Animate transition
        await this.animateStepTransition('lectureSelectionStep', 'recordSelectionStep');
        this.currentStep = 'record';
        
        // Show selection info
        const selectionInfo = document.getElementById('selectionInfo');
        selectionInfo.style.display = 'flex';
    }

    async proceedToTimer() {
        console.log('=== proceedToTimer called ===');
        console.log('this.currentRecord:', this.currentRecord);
        console.log('this.timerState.currentRecord:', this.timerState.currentRecord);
        console.log('this.currentLecture:', this.currentLecture);
        console.log('this.timerState.currentLecture:', this.timerState.currentLecture);
        
        // Sync record variables
        this.timerState.currentRecord = this.currentRecord;
        
        // Update selection info - 새 기록일 때 '새 기록'으로 표시
        const recordText = this.currentRecord === 'new' ? '새 기록' : this.currentRecord;
        document.getElementById('selectedRecord').textContent = recordText;
        
        // Load record content if existing record selected
        if (this.currentRecord !== 'new') {
            console.log('Loading existing record:', this.currentRecord);
            await this.loadRecordContent(this.currentRecord);
            
            // 기존 기록이 로드된 후, 마지막 슬라이드의 END TIME으로 타이머 설정
            if (this.slides && this.slides.length > 0) {
                const lastSlide = this.slides[this.slides.length - 1];
                if (lastSlide && lastSlide.end_time) {
                    const endTime = lastSlide.end_time;
                    
                    // 타이머 시작 시간을 마지막 기록의 END TIME으로 설정
                    this.timerState.sessionStartTime = endTime;
                    
                    // 시간 설정 input 필드도 업데이트
                    const startTimeInput = document.getElementById('startTime');
                    if (startTimeInput) {
                        startTimeInput.value = endTime;
                    }
                    
                    console.log('Timer set to last slide END TIME:', endTime);
                    this.showToast(`타이머가 마지막 기록 시간(${endTime})으로 설정되었습니다.`, 'info');
                }
            }
        } else {
            console.log('Starting new session - clearing slides');
            // For new records, clear slides and reset timer
            this.slides = [];
            this.timerState.slides = [];
            this.timerState.sessionStartTime = '00:00:00.000';
            
            // 새 기록일 때는 시간 설정을 기본값으로 리셋
            const startTimeInput = document.getElementById('startTime');
            if (startTimeInput) {
                startTimeInput.value = '00:00:00.000';
            }
            
            this.updateSlidesTable();
            this.updateRecordCount();
        }
        
        // Animate transition
        await this.animateStepTransition('recordSelectionStep', 'timerInterface');
        this.currentStep = 'timer';
        
        // 타이머 인터페이스가 표시된 후 UI 상태 업데이트
        setTimeout(() => {
            this.updateTimerButton();
            this.updateTimerStatus('Ready to Start');
            this.updateTimerDisplay();
        }, 100);
        
        this.showToast('Timer interface ready!', 'success');
    }

    async animateStepTransition(fromElementId, toElementId) {
        const fromElement = document.getElementById(fromElementId);
        const toElement = document.getElementById(toElementId);
        
        // Exit animation for current step
        fromElement.classList.add('step-exiting');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide current step and show next step
        fromElement.style.display = 'none';
        fromElement.classList.remove('step-exiting');
        
        toElement.style.display = 'block';
        toElement.classList.add('step-entering');
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        toElement.classList.remove('step-entering');
    }

    // Methods to change selection (called from header buttons)
    changeLecture() {
        this.resetToLectureSelection();
    }

    changeRecord() {
        this.resetToRecordSelection();
    }

    resetToLectureSelection() {
        // Hide all steps and selection info
        document.getElementById('selectionInfo').style.display = 'none';
        document.getElementById('recordSelectionStep').style.display = 'none';
        document.getElementById('timerInterface').style.display = 'none';
        
        // Show lecture selection
        const lectureStep = document.getElementById('lectureSelectionStep');
        lectureStep.style.display = 'block';
        lectureStep.classList.add('step-entering');
        
        setTimeout(() => {
            lectureStep.classList.remove('step-entering');
        }, 500);
        
        this.currentStep = 'lecture';
        this.currentLecture = '';
        this.currentRecord = '';
        
        // Reset form
        document.getElementById('lectureSelect').value = '';
        document.getElementById('selectLectureBtn').disabled = true;
    }

    resetToRecordSelection() {
        // Hide timer interface
        document.getElementById('timerInterface').style.display = 'none';
        
        // Show record selection
        const recordStep = document.getElementById('recordSelectionStep');
        recordStep.style.display = 'block';
        recordStep.classList.add('step-entering');
        
        setTimeout(() => {
            recordStep.classList.remove('step-entering');
        }, 500);
        
        this.currentStep = 'record';
        this.currentRecord = '';
        
        // Reset record selection
        document.getElementById('recordSelect').value = 'new';
        
        // Update selection info - 기본값을 '새 기록'으로 설정
        document.getElementById('selectedRecord').textContent = '새 기록';
    }

    // ===== SRT Parser Functionality =====
    
    async initializeSrtParserTab() {
        // Load lectures for selection
        await this.loadLecturesForParser();
        // Reset parser state
        this.resetSrtParserState();
        // Reset to lecture selection step
        this.resetToParserLectureSelection();
    }
    
    async loadLecturesForParser() {
        try {
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }

            // GitHub API에서 강의 목록 로드
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures`);
            const data = await response.json();
            
            const lectures = data.lectures || [];
            const select = document.getElementById('parserLectureSelect');
            
            if (select) {
                select.innerHTML = '<option value="">강의를 선택하세요...</option>';
                
                lectures.forEach(lecture => {
                    const option = document.createElement('option');
                    option.value = lecture.id;
                    option.textContent = lecture.name;
                    option.dataset.lectureName = lecture.name;
                    select.appendChild(option);
                });
            }
            
            if (lectures.length === 0) {
                this.showToast('생성된 강의가 없습니다. Settings에서 강의를 추가해주세요.', 'info');
            }
        } catch (error) {
            console.error('Error loading lectures for parser:', error);
            this.showToast('강의 목록 로드 실패', 'error');
        }
    }
    
    resetSrtParserState() {
        this.srtParser = {
            uploadedFileId: null,
            selectedLecture: '',
            selectedRecord: '',
            parseResults: [],
            isProcessing: false,
            currentStep: 'lecture'
        };
    }
    
    updateSrtParserUI() {
        // Reset file input
        const srtFileInput = document.getElementById('srtFile');
        if (srtFileInput) {
            srtFileInput.value = '';
        }
        
        // Update file label
        const fileLabel = document.querySelector('label[for="srtFile"]');
        if (fileLabel) {
            fileLabel.innerHTML = '<i class="fas fa-file-upload"></i> Choose SRT File';
        }
        
        // Clear previews
        this.updateTimerPreview('');
        this.updateSrtPreview('');
        
        // Clear results
        this.clearSrtResults();
        
        // Disable parse button
        const parseBtn = document.getElementById('parseFilesBtn');
        if (parseBtn) {
            parseBtn.disabled = true;
        }
    }
    
    async handleSrtFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.srt')) {
            this.showToast('Please select a valid SRT file', 'error');
            event.target.value = '';
            return;
        }
        
        // Show loading state
        const fileLabel = document.querySelector('label[for="srtFile"]');
        if (fileLabel) {
            fileLabel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/srt/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }
            
            const data = await response.json();
            
            // Store uploaded file ID
            this.srtParser.uploadedFileId = data.file_id;
            
            // Update UI
            if (fileLabel) {
                fileLabel.innerHTML = `<i class="fas fa-check"></i> ${file.name}`;
                fileLabel.style.background = 'var(--success)';
                fileLabel.style.color = 'white';
            }
            
            // Update SRT preview
            this.updateSrtPreview(data);
            
            // Enable parse button if file is uploaded
            const parseBtn = document.getElementById('parseFilesBtn');
            if (parseBtn) {
                parseBtn.disabled = false;
            }
            
            this.showToast(`SRT file uploaded successfully (${data.subtitle_count} subtitles)`, 'success');
            
        } catch (error) {
            console.error('Error uploading SRT file:', error);
            this.showToast(error.message || 'Failed to upload SRT file', 'error');
            
            // Reset UI
            if (fileLabel) {
                fileLabel.innerHTML = '<i class="fas fa-file-upload"></i> Choose SRT File';
                fileLabel.style.background = '';
                fileLabel.style.color = '';
            }
            event.target.value = '';
        }
    }
    
    updateTimerPreview(data) {
        const preview = document.getElementById('timerPreview');
        if (!preview) return;
        
        // Handle localStorage data structure (simple array of slides)
        if (!data || (!Array.isArray(data) && !data.records)) {
            preview.innerHTML = 'Select a timer record to preview';
            return;
        }
        
        // Support both API format (data.records) and localStorage format (data is array)
        const records = Array.isArray(data) ? data : data.records;
        const lectureName = this.srtParser?.selectedLecture || 'Unknown';
        
        if (!records || records.length === 0) {
            preview.innerHTML = 'No slides found in this record';
            return;
        }
        
        const previewRecords = records.slice(0, 3); // Show first 3 records
        const html = `
            <div class="preview-info">
                <strong>Lecture:</strong> ${lectureName}<br>
                <strong>Records:</strong> ${records.length} slides<br>
                <strong>Record:</strong> ${this.srtParser?.selectedRecord || 'Unknown'}
            </div>
            <div class="preview-records">
                ${previewRecords.map(record => `
                    <div class="preview-record">
                        <strong>Slide ${record.slide_number}:</strong> ${record.slide_title || 'Untitled'}<br>
                        <span class="time-range">${record.start_time} → ${record.end_time}</span>
                    </div>
                `).join('')}
                ${records.length > 3 ? `<div class="preview-more">... and ${records.length - 3} more slides</div>` : ''}
            </div>
        `;
        
        preview.innerHTML = html;
    }
    
    updateSrtPreview(data) {
        const preview = document.getElementById('srtPreview');
        if (!preview) return;
        
        if (!data || !data.preview) {
            preview.innerHTML = 'Upload an SRT file to preview';
            return;
        }
        
        const html = `
            <div class="preview-info">
                <strong>File:</strong> ${data.filename}<br>
                <strong>Subtitles:</strong> ${data.subtitle_count}<br>
                <strong>Duration:</strong> ${data.duration}
            </div>
            <div class="preview-subtitles">
                ${data.preview.map(subtitle => `
                    <div class="preview-subtitle">
                        <span class="subtitle-time">${this.formatTime(subtitle.start_time * 1000)} → ${this.formatTime(subtitle.end_time * 1000)}</span><br>
                        <span class="subtitle-text">${subtitle.text}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        preview.innerHTML = html;
    }
    
    async parseFiles() {
        if (!this.srtParser.uploadedFileId || !this.srtParser.selectedLecture || !this.srtParser.selectedRecord) {
            this.showToast('Please upload SRT file first', 'error');
            return;
        }
        
        this.srtParser.isProcessing = true;
        const parseBtn = document.getElementById('parseFilesBtn');
        if (parseBtn) {
            parseBtn.disabled = true;
            parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        
        try {
            // Get timer record from localStorage instead of backend
            const records = this.getStoredRecords(this.srtParser.selectedLecture);
            const timerRecord = records[this.srtParser.selectedRecord];
            
            if (!timerRecord || !Array.isArray(timerRecord)) {
                throw new Error('Timer record not found or invalid format');
            }
            
            // Create FormData with SRT file and timer record
            const formData = new FormData();
            formData.append('file_id', this.srtParser.uploadedFileId);
            formData.append('timer_records', JSON.stringify(timerRecord));
            
            const response = await fetch('/api/srt/parse-with-data', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Parsing failed');
            }
            
            const data = await response.json();
            
            // Store results
            this.srtParser.parseResults = data.results;
            
            // Display results
            this.displaySrtResults(data);
            
            this.showToast(`Parsing completed! ${data.slide_count} slides processed`, 'success');
            
        } catch (error) {
            console.error('Error parsing files:', error);
            this.showToast(error.message || 'Failed to parse files', 'error');
        } finally {
            this.srtParser.isProcessing = false;
            if (parseBtn) {
                parseBtn.disabled = false;
                parseBtn.innerHTML = '<i class="fas fa-cogs"></i> Parse Files';
            }
        }
    }
    
    displaySrtResults(data) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        
        if (!data.results || data.results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No matching content found between SRT and timer records</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="results-header">
                <h4>Parsing Results</h4>
                <div class="results-meta">
                    <span class="meta-item"><i class="fas fa-list"></i> ${data.slide_count} slides</span>
                    <span class="meta-item"><i class="fas fa-clock"></i> ${new Date().toLocaleString()}</span>
                </div>
            </div>
            <div class="results-content">
                ${data.results.map((result, index) => `
                    <div class="result-slide" data-slide-index="${index}">
                        <div class="slide-header">
                            <div class="slide-info">
                                <span class="slide-title slide-title-editable" contenteditable="true" data-field="title">${result.slide_title || 'Untitled'}</span>
                                <span class="slide-number">Slide ${result.slide_number}</span>
                            </div>
                            <div class="slide-time">
                                <span class="time-range">${result.start_time} → ${result.end_time}</span>
                            </div>
                        </div>
                        <div class="slide-content">
                            <div class="slide-notes slide-notes-editable" contenteditable="true" data-field="notes">
                                <strong>Notes:</strong> ${result.notes || ''}
                            </div>
                            <div class="slide-text" style="position: relative;">
                                <label>Extracted Text:</label>
                                <button class="copy-button" onclick="app.copyText(this)" data-text="${result.text.replace(/"/g, '&quot;')}">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                                <textarea class="result-text-area" rows="4" data-field="text">${result.text}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Setup content editing listeners
        this.setupResultsEditingListeners();
        
        // Enable export button
        const exportBtn = document.getElementById('exportResultsBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
        }
    }
    
    clearSrtResults() {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Parse files to see results here</p>
                </div>
            `;
        }
        
        // Disable export button
        const exportBtn = document.getElementById('exportResultsBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
        }
    }
    
    async exportSrtResults() {
        if (!this.srtParser.parseResults || this.srtParser.parseResults.length === 0) {
            this.showToast('No results to export', 'error');
            return;
        }
        
        const results = this.srtParser.parseResults;
        const lectureName = this.srtParser.selectedLecture || 'lecture';
        const recordName = this.srtParser.selectedRecord || 'record';
        const fileName = `${lectureName}_${recordName}_srt_results.json`;
        
        const exportData = {
            metadata: {
                lecture: lectureName,
                record: recordName,
                srt_file: this.srtParser.selectedFile?.name || 'unknown.srt',
                processed_at: new Date().toISOString(),
                slide_count: results.length
            },
            results: results
        };
        
        try {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = fileName;
            link.click();
            
            this.showToast('Results exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting results:', error);
            this.showToast('Failed to export results', 'error');
        }
    }

    onParserLectureSelectChange(lectureId) {
        const select = document.getElementById('parserLectureSelect');
        const selectedOption = select.selectedOptions[0];
        const lectureName = selectedOption ? selectedOption.dataset.lectureName : '';
        
        this.srtParser.selectedLecture = lectureId;
        this.srtParser.selectedLectureName = lectureName;
        
        const selectBtn = document.getElementById('selectParserLectureBtn');
        selectBtn.disabled = !lectureId;
    }
    
    async proceedToParserRecordSelection() {
        console.log('=== proceedToParserRecordSelection called ===');
        console.log('this.srtParser.selectedLecture:', this.srtParser.selectedLecture);
        
        if (!this.srtParser.selectedLecture) {
            console.log('No lecture selected, returning');
            return;
        }
        
        // Update selection info
        document.getElementById('selectedParserLecture').textContent = this.srtParser.selectedLecture;
        
        // Load records for this lecture
        await this.loadRecordsForParser();
        
        // Animate transition
        await this.animateStepTransition('parserLectureSelectionStep', 'parserRecordSelectionStep');
        this.srtParser.currentStep = 'record';
        
        // Show selection info
        const selectionInfo = document.getElementById('parserSelectionInfo');
        selectionInfo.style.display = 'flex';
        
        console.log('proceedToParserRecordSelection completed');
    }
    
    async loadRecordsForParser() {
        if (!this.srtParser.selectedLecture) return;

        try {
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }

            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures/${this.srtParser.selectedLecture}/timer-records`);
            const data = await response.json();
            
            const records = data.records || [];
            const select = document.getElementById('parserRecordSelect');
            select.innerHTML = '<option value="">타이머 기록을 선택하세요...</option>';
            
            records.forEach(record => {
                const option = document.createElement('option');
                option.value = record.id;
                option.textContent = record.session_name || `기록 ${record.id.slice(0, 8)}`;
                select.appendChild(option);
            });
            
            if (records.length === 0) {
                this.showToast('해당 강의에 저장된 타이머 기록이 없습니다', 'warning');
            }
        } catch (error) {
            console.error('Failed to load records:', error);
            this.showToast('타이머 기록 로드 실패', 'error');
        }
    }
    
    onParserRecordSelectChange(recordFile) {
        this.srtParser.selectedRecord = recordFile;
        const selectBtn = document.getElementById('selectParserRecordBtn');
        selectBtn.disabled = !recordFile;
    }
    
    async proceedToSrtFileUpload() {
        if (!this.srtParser.selectedRecord) return;
        
        // Update selection info
        document.getElementById('selectedParserRecord').textContent = this.srtParser.selectedRecord;
        
        // Show selection info
        document.getElementById('parserSelectionInfo').style.display = 'block';
        
        // Animate transition
        await this.animateStepTransition('parserRecordSelectionStep', 'srtFileUploadStep');
        this.srtParser.currentStep = 'srtUpload';
        
        this.showToast('Now upload your SRT file', 'info');
    }
    
    handleSrtFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        // Check file type
        if (!file.name.toLowerCase().endsWith('.srt')) {
            this.showToast('Please select a valid SRT file', 'error');
                return;
            }
            
        // Store the file
        this.srtParser.selectedFile = file;
        
        // Update UI
        const uploadArea = document.getElementById('srtUploadArea');
        const uploadBtn = document.getElementById('uploadSrtBtn');
        
        uploadArea.classList.add('file-selected');
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="upload-text">
                <h5>${file.name}</h5>
                <p>File selected successfully</p>
                <small>Size: ${(file.size / 1024).toFixed(2)} KB</small>
            </div>
        `;
        
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Parse';
        
        // Update selection info
        document.getElementById('selectedSrtFile').textContent = file.name;
        
        this.showToast('SRT file selected successfully', 'success');
    }
    
    async proceedToParserInterface() {
        console.log('proceedToParserInterface called');
        console.log('selectedFile:', this.srtParser.selectedFile);
        
        if (!this.srtParser.selectedFile) {
            console.log('No SRT file selected, returning');
            this.showToast('Please select an SRT file first', 'error');
            return;
        }
        
        try {
            console.log('Animating transition...');
            // Animate transition
            await this.animateStepTransition('srtFileUploadStep', 'parserInterface');
            this.srtParser.currentStep = 'interface';
            
            // Show processing message
            this.showToast('Processing files...', 'info');
            
            console.log('Reading SRT file content...');
            // Read SRT file content
            const srtContent = await this.readFileAsText(this.srtParser.selectedFile);
            
            // Immediately start parsing
            await this.parseFilesLocally(srtContent);
            
        } catch (error) {
            console.error('Error in proceedToParserInterface:', error);
            this.showToast('Error processing files: ' + error.message, 'error');
        }
    }
    
    async parseFilesLocally(srtContent) {
        try {
            // 로그인 상태 확인
            if (!this.userState.isLoggedIn) {
                this.showToast('로그인이 필요합니다', 'warning');
                return;
            }

            // GitHub API에서 타이머 기록 로드
            const response = await fetch(`/api/users/${this.userState.currentUser.username}/lectures/${this.srtParser.selectedLecture}/timer-records/${this.srtParser.selectedRecord}`);
            const data = await response.json();
            
            if (!data.success || !data.record) {
                throw new Error('타이머 기록을 찾을 수 없습니다');
            }

            const timerRecord = data.record.records || [];
            
            if (!Array.isArray(timerRecord) || timerRecord.length === 0) {
                throw new Error('유효한 타이머 기록이 없습니다');
            }
            
            // Parse SRT content
            const subtitles = this.parseSrtContent(srtContent);
            
            // Match timer records with SRT subtitles
            const results = this.matchTimerWithSrt(timerRecord, subtitles);
            
            // Display results
            this.displayLocalResults(results);
            
            this.showToast(`파싱 완료! ${results.length}개 슬라이드 처리됨`, 'success');
            
        } catch (error) {
            console.error('Error parsing files locally:', error);
            this.showToast(error.message || '파일 파싱 실패', 'error');
        }
    }
    
    parseSrtContent(srtContent) {
        const lines = srtContent.split('\n');
        const subtitles = [];
        let currentSubtitle = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                if (currentSubtitle.text) {
                    subtitles.push(currentSubtitle);
                    currentSubtitle = {};
                }
                continue;
            }
            
            if (/^\d+$/.test(line)) {
                currentSubtitle.index = parseInt(line);
            } else if (/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line)) {
                const [start, end] = line.split(' --> ');
                currentSubtitle.start_time = this.parseTimeToMs(start);
                currentSubtitle.end_time = this.parseTimeToMs(end);
                currentSubtitle.start = start;
                currentSubtitle.end = end;
            } else if (currentSubtitle.start && !currentSubtitle.text) {
                currentSubtitle.text = line;
            } else if (currentSubtitle.text) {
                // Append additional text lines
                currentSubtitle.text += ' ' + line;
            }
        }
        
        // Add last subtitle if exists
        if (currentSubtitle.text) {
            subtitles.push(currentSubtitle);
        }
        
        return subtitles;
    }
    
    parseTimeToMs(timeStr) {
        // Convert "HH:MM:SS,mmm" to milliseconds
        const [time, ms] = timeStr.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms);
    }
    
    matchTimerWithSrt(timerRecord, subtitles) {
        const results = [];
        
        for (const slide of timerRecord) {
            const slideStartMs = this.parseTime(slide.start_time);
            const slideEndMs = this.parseTime(slide.end_time);
            
            // Find SRT subtitles that overlap with this slide's time range
            const matchingSubtitles = subtitles.filter(subtitle => {
                return (subtitle.start_time < slideEndMs && subtitle.end_time > slideStartMs);
            });
            
            // Combine text from matching subtitles
            const extractedText = matchingSubtitles
                .map(subtitle => subtitle.text)
                .join(' ')
                .trim();
            
            results.push({
                slide_number: slide.slide_number,
                slide_title: slide.slide_title || 'Untitled',
                start_time: slide.start_time,
                end_time: slide.end_time,
                notes: slide.notes || '',
                text: extractedText || 'No matching text found',
                matched_subtitles: matchingSubtitles.length
            });
        }
        
        return results;
    }
    
    displayLocalResults(results) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No slides found to process</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <div class="results-header">
                <h4>Parsing Results</h4>
                <div class="results-meta">
                    <span class="meta-item"><i class="fas fa-list"></i> ${results.length} slides</span>
                    <span class="meta-item"><i class="fas fa-clock"></i> ${new Date().toLocaleString()}</span>
                </div>
            </div>
            <div class="results-content">
                ${results.map((result, index) => `
                    <div class="result-slide" data-slide-index="${index}">
                        <div class="slide-header">
                            <div class="slide-info">
                                <span class="slide-title slide-title-editable" contenteditable="true" data-field="title">${result.slide_title}</span>
                                <span class="slide-number">Slide ${result.slide_number}</span>
                            </div>
                            <div class="slide-time">
                                <span class="time-range">${result.start_time} → ${result.end_time}</span>
                                <small class="subtitle-count">${result.matched_subtitles} subtitles</small>
                            </div>
                        </div>
                        <div class="slide-content">
                            <div class="slide-notes slide-notes-editable" contenteditable="true" data-field="notes">
                                <strong>Notes:</strong> ${result.notes || ''}
                            </div>
                            <div class="slide-text" style="position: relative;">
                                <label>Extracted Text:</label>
                                <button class="copy-button" onclick="app.copyText(this)" data-text="${result.text.replace(/"/g, '&quot;')}">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                                <textarea class="result-text-area" rows="4" data-field="text">${result.text}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Setup content editing listeners
        this.setupResultsEditingListeners();
        
        // Store results for export
        this.srtParser.parseResults = results;
        
        // Enable export button
        const exportBtn = document.getElementById('exportResultsBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
        }
    }
    
    changeSrtFile() {
        this.resetToSrtFileUpload();
    }
    
    resetToSrtFileUpload() {
        // Hide interface
        document.getElementById('parserInterface').style.display = 'none';
        
        // Show SRT upload step
        const srtStep = document.getElementById('srtFileUploadStep');
        srtStep.style.display = 'block';
        srtStep.classList.add('step-entering');
        
        setTimeout(() => {
            srtStep.classList.remove('step-entering');
        }, 500);
        
        this.srtParser.currentStep = 'srtUpload';
        this.srtParser.selectedFile = null;
        
        // Reset upload area
        const uploadArea = document.getElementById('srtUploadArea');
        const uploadBtn = document.getElementById('uploadSrtBtn');
        const fileInput = document.getElementById('srtFileInput');
        
        uploadArea.classList.remove('file-selected');
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <div class="upload-text">
                <h5>SRT 파일을 여기에 드래그하세요</h5>
                <p>또는 <span class="upload-link">browse files</span></p>
                <small>SRT 파일만 허용됩니다</small>
            </div>
        `;
        
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Parse';
        fileInput.value = '';
        
        // Update selection info
        document.getElementById('selectedSrtFile').textContent = '-';
        
        // Clear previews and results
        this.updateSrtPreview('');
        this.clearSrtResults();
    }
    
    resetToParserRecordSelection() {
        // Hide SRT upload and interface
        document.getElementById('srtFileUploadStep').style.display = 'none';
        document.getElementById('parserInterface').style.display = 'none';
        
        // Show record selection
        const recordStep = document.getElementById('parserRecordSelectionStep');
        recordStep.style.display = 'block';
        recordStep.classList.add('step-entering');
        
        setTimeout(() => {
            recordStep.classList.remove('step-entering');
        }, 500);
        
        this.srtParser.currentStep = 'record';
        this.srtParser.selectedRecord = '';
        this.srtParser.selectedFile = null;
        
        // Reset record selection
        document.getElementById('parserRecordSelect').value = '';
        document.getElementById('selectParserRecordBtn').disabled = true;
        
        // Update selection info
        document.getElementById('selectedParserRecord').textContent = '-';
        document.getElementById('selectedSrtFile').textContent = '-';
        
        // Reset SRT upload area (call the reset function)
        this.resetSrtUploadArea();
        
        // Clear previews and results
        this.updateSrtPreview('');
        this.clearSrtResults();
    }
    
    resetToParserLectureSelection() {
        // Hide all steps and selection info
        document.getElementById('parserSelectionInfo').style.display = 'none';
        document.getElementById('parserRecordSelectionStep').style.display = 'none';
        document.getElementById('srtFileUploadStep').style.display = 'none';
        document.getElementById('parserInterface').style.display = 'none';
        
        // Show lecture selection
        const lectureStep = document.getElementById('parserLectureSelectionStep');
        lectureStep.style.display = 'block';
        lectureStep.classList.add('step-entering');
        
        setTimeout(() => {
            lectureStep.classList.remove('step-entering');
        }, 500);
        
        this.srtParser.currentStep = 'lecture';
        this.srtParser.selectedLecture = '';
        this.srtParser.selectedRecord = '';
        this.srtParser.selectedFile = null;
        
        // Reset form
        document.getElementById('parserLectureSelect').value = '';
        document.getElementById('selectParserLectureBtn').disabled = true;
        
        // Reset SRT upload area
        this.resetSrtUploadArea();
        
        // Clear previews and results
        this.updateTimerPreview('');
        this.updateSrtPreview('');
        this.clearSrtResults();
    }
    
    resetSrtUploadArea() {
        const uploadArea = document.getElementById('srtUploadArea');
        const uploadBtn = document.getElementById('uploadSrtBtn');
        const fileInput = document.getElementById('srtFileInput');
        
        if (uploadArea) {
            uploadArea.classList.remove('file-selected');
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <div class="upload-text">
                    <h5>SRT 파일을 여기에 드래그하세요</h5>
                    <p>또는 <span class="upload-link">browse files</span></p>
                    <small>SRT 파일만 허용됩니다</small>
                </div>
            `;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Parse';
        }
        
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    // Methods to change selection (called from header buttons)
    changeParserLecture() {
        this.resetToParserLectureSelection();
    }

    changeParserRecord() {
        this.resetToParserRecordSelection();
    }

    // ===== HOME TAB FUNCTIONALITY =====
    
    setupHomeListeners() {
        // 더 이상 복잡한 Home 기능이 없으므로 간단하게 유지
        console.log('Home listeners set up');
    }

    // ===== SETTINGS TAB METHODS =====
    
    async loadLecturesForSettings() {
        console.log('Loading lectures for settings...'); // 디버깅 로그 추가
        try {
            // Use localStorage instead of API
            const lectures = this.getStoredLectures();
            console.log('Found lectures:', lectures); // 디버깅 로그 추가
            
            const jsonLectureSelect = document.getElementById('jsonLectureSelect');
            console.log('jsonLectureSelect element:', jsonLectureSelect); // 디버깅 로그 추가
            
            if (jsonLectureSelect) {
                jsonLectureSelect.innerHTML = '<option value="">강의를 선택하세요</option>';
                lectures.forEach(lecture => {
                    const option = document.createElement('option');
                    option.value = lecture;
                    option.textContent = lecture;
                    jsonLectureSelect.appendChild(option);
                    console.log('Added lecture option:', lecture); // 디버깅 로그 추가
                });
            } else {
                console.error('jsonLectureSelect element not found!');
            }
        } catch (error) {
            console.error('Error loading lectures for settings:', error);
            this.showToast('Failed to load lectures', 'error');
        }
    }
    
    loadPreferences() {
        const preferences = JSON.parse(localStorage.getItem('slideScribePreferences') || '{}');
        
        // Merge with defaults
        this.settingsState.preferences = {
            ...this.settingsState.preferences,
            ...preferences
        };

        // Apply to UI
        const darkModeToggle = document.getElementById('darkModeToggle');
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        const timerFormatSelect = document.getElementById('defaultTimerFormat');
        const notificationToggle = document.getElementById('notificationToggle');

        if (darkModeToggle) darkModeToggle.checked = this.settingsState.preferences.darkMode;
        if (autoSaveToggle) autoSaveToggle.checked = this.settingsState.preferences.autoSave;
        if (timerFormatSelect) timerFormatSelect.value = this.settingsState.preferences.timerFormat;
        if (notificationToggle) notificationToggle.checked = this.settingsState.preferences.notifications;

        // Apply dark mode
        if (this.settingsState.preferences.darkMode) {
            document.body.classList.add('dark-mode');
        }
    }
    
    updatePreference(key, value) {
        this.settingsState.preferences[key] = value;
        this.saveUserPreferences(this.settingsState.preferences);
        
        // Apply the preference immediately if needed
        if (key === 'darkMode') {
            if (value) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        
        this.showToast(`Preference "${key}" updated`, 'success');
    }
    
    onJsonLectureSelectChange(lectureName) {
        console.log('JSON lecture selection changed:', lectureName); // 기존 디버깅 로그
        this.settingsState.selectedLecture = lectureName;
        
        const uploadSection = document.getElementById('jsonUploadSection');
        const fileSection = document.getElementById('jsonFileSection');
        
        if (lectureName) {
            if (uploadSection) uploadSection.style.display = 'block';
            if (fileSection) fileSection.style.display = 'block';
            this.loadJsonFileList();
        } else {
            if (uploadSection) uploadSection.style.display = 'none';
            if (fileSection) fileSection.style.display = 'none';
            
            // Clear file list
            const jsonFileList = document.getElementById('jsonFileList');
            if (jsonFileList) {
                jsonFileList.innerHTML = '';
            }
        }
    }
    
    async loadJsonFileList() {
        if (!this.settingsState.selectedLecture) {
            console.log('No lecture selected for JSON file loading');
            return;
        }
        
        try {
            // Use localStorage instead of API
            const records = this.getStoredRecords(this.settingsState.selectedLecture);
            const jsonFileList = document.getElementById('jsonFileList');
            
            if (!jsonFileList) {
                console.error('jsonFileList element not found');
                return;
            }
            
            if (!records || Object.keys(records).length === 0) {
                jsonFileList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-code"></i>
                        <p>No JSON files found for this lecture</p>
                        <small>Upload a JSON file or create records using the timer to see them here</small>
                    </div>
                `;
                this.settingsState.jsonFiles = [];
                return;
            }
            
            const recordNames = Object.keys(records);
            jsonFileList.innerHTML = recordNames.map(record => {
                const recordData = records[record];
                const slideCount = Array.isArray(recordData) ? recordData.length : 0;
                
                return `
                    <div class="json-file-item">
                        <div class="json-file-info">
                            <div class="json-file-icon">
                                <i class="fas fa-file-code"></i>
                            </div>
                            <div class="json-file-details">
                                <div class="json-file-name">${record}</div>
                                <div class="json-file-meta">${slideCount} slides</div>
                            </div>
                        </div>
                        <div class="json-file-actions">
                            <button class="btn btn-sm btn-outline" onclick="app.editJsonFile('${record}')" title="Edit as text">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="app.editJsonFileTable('${record}')" title="Edit in table view">
                                <i class="fas fa-table"></i>
                                Table Edit
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="app.downloadJsonFile('${record}')" title="Download JSON file">
                                <i class="fas fa-download"></i>
                                Download
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteJsonFile('${record}')" title="Delete file">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            this.settingsState.jsonFiles = recordNames;
            console.log(`Loaded ${recordNames.length} JSON files for lecture: ${this.settingsState.selectedLecture}`);
        } catch (error) {
            console.error('Error loading JSON file list:', error);
            const jsonFileList = document.getElementById('jsonFileList');
            if (jsonFileList) {
                jsonFileList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading JSON files</p>
                        <small>Please try refreshing the page or contact support</small>
                    </div>
                `;
            }
            this.showToast('Failed to load JSON files', 'error');
        }
    }
    
    handleJsonFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/json') {
            this.showToast('Please select a valid JSON file', 'error');
            return;
        }
        
        const uploadBtn = document.getElementById('uploadJsonBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `
                <i class="fas fa-upload"></i>
                Upload "${file.name}"
            `;
        }
    }
    
    async uploadJsonFile() {
        const fileInput = document.getElementById('jsonFileInput');
        const file = fileInput.files[0];
        
        if (!file || !this.settingsState.selectedLecture) {
            this.showToast('Please select a file and lecture', 'error');
            return;
        }
        
        try {
            // Validate JSON content
            const content = await this.readFileAsText(file);
            const jsonData = JSON.parse(content); // This will throw if invalid JSON
            
            // Validate that it's an array of slide objects
            if (!Array.isArray(jsonData)) {
                throw new Error('JSON file must contain an array of slides');
            }
            
            // Save to localStorage instead of uploading to server
            const recordName = file.name.replace('.json', '');
            this.saveStoredRecord(this.settingsState.selectedLecture, recordName, jsonData);
            
                this.showToast(`File "${file.name}" uploaded successfully!`, 'success');
                fileInput.value = '';
            
                const uploadBtn = document.getElementById('uploadJsonBtn');
                if (uploadBtn) {
                    uploadBtn.disabled = true;
                    uploadBtn.innerHTML = `
                        <i class="fas fa-upload"></i>
                        Upload JSON File
                    `;
                }
            
                await this.loadJsonFileList();
                await this.updateHomeStats(); // Refresh stats
            
        } catch (error) {
            console.error('Error uploading JSON file:', error);
            if (error instanceof SyntaxError) {
                this.showToast('Invalid JSON file format', 'error');
            } else {
                this.showToast('Failed to upload file: ' + error.message, 'error');
            }
        }
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    async editJsonFile(filename) {
        if (!this.settingsState.selectedLecture) return;
        
        try {
            // Load from localStorage instead of API
            const records = this.getStoredRecords(this.settingsState.selectedLecture);
            const data = records[filename];
            
            if (data && Array.isArray(data)) {
                this.settingsState.currentEditingFile = filename;
                this.showJsonEditor(JSON.stringify(data, null, 2));
            } else {
                throw new Error(`Record "${filename}" not found or invalid format`);
            }
        } catch (error) {
            console.error('Error loading JSON file for editing:', error);
            this.showToast('Failed to load file for editing', 'error');
        }
    }

    editJsonFileTable(filename) {
        if (!this.settingsState.selectedLecture) return;
        
        try {
            // Load from localStorage
            const records = this.getStoredRecords(this.settingsState.selectedLecture);
            const data = records[filename];
            
            if (data && Array.isArray(data)) {
                this.settingsState.currentEditingFile = filename;
                this.settingsState.currentEditingData = JSON.parse(JSON.stringify(data)); // Deep copy
                this.showJsonTableEditor(filename, data);
            } else {
                throw new Error(`Record "${filename}" not found or invalid format`);
            }
        } catch (error) {
            console.error('Error loading JSON file for table editing:', error);
            this.showToast('Failed to load file for table editing', 'error');
        }
    }

    showJsonTableEditor(filename, data) {
        const modal = document.getElementById('jsonTableModal');
        const title = document.getElementById('jsonTableTitle');
        
        if (title) {
            title.textContent = `Edit: ${filename}`;
        }
        
        this.renderJsonTable(data);
        
        if (modal) {
            modal.classList.add('show');
        }
    }

    renderJsonTable(data) {
        const tbody = document.getElementById('jsonDataTableBody');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" class="text-center">
                        <div class="empty-state-inline">
                            <i class="fas fa-clock"></i>
                            <span>No slides found</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map((slide, index) => `
            <tr data-slide-index="${index}">
                <td class="editable" data-field="slide_number" data-index="${index}">
                    ${slide.slide_number || ''}
                </td>
                <td class="editable" data-field="slide_title" data-index="${index}">
                    ${slide.slide_title || ''}
                </td>
                <td class="editable" data-field="start_time" data-index="${index}">
                    ${slide.start_time || ''}
                </td>
                <td class="editable" data-field="end_time" data-index="${index}">
                    ${slide.end_time || ''}
                </td>
                <td class="editable" data-field="notes" data-index="${index}">
                    <span class="notes-text">${(slide.notes || '-').replace(/\n/g, '\\n')}</span>
                    <i class="fas fa-pencil-alt edit-indicator"></i>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm" onclick="app.duplicateJsonSlide(${index})" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteJsonSlide(${index})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add click listeners for editable cells
        tbody.querySelectorAll('td.editable').forEach(cell => {
            cell.addEventListener('click', (e) => this.startJsonCellEdit(e.target.closest('td')));
        });
    }

    startJsonCellEdit(cell) {
        // Check if another cell is already being edited
        const existingEdit = document.querySelector('#jsonDataTable td.editing');
        if (existingEdit && existingEdit !== cell) {
            this.cancelJsonCellEdit(existingEdit);
        }

        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        const currentValue = this.settingsState.currentEditingData[index][field] || '';
        
        // Store original value
        cell.dataset.originalValue = currentValue;
        
        // Create input element
        const input = document.createElement(field === 'notes' ? 'textarea' : 'input');
        input.className = 'edit-input';
        
        // textarea에는 type 속성이 없으므로 input일 때만 설정
        if (field !== 'notes') {
            input.type = field === 'slide_number' ? 'number' : 'text';
        }
        
        input.value = currentValue === '-' ? '' : currentValue;
        
        if (field === 'notes') {
            input.rows = 2;
            console.log('Created textarea for notes with value:', input.value);
        }
        
        // Create control buttons
        const controls = document.createElement('div');
        controls.className = 'edit-controls';
        controls.innerHTML = `
            <button class="btn btn-success btn-sm save-edit">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-secondary btn-sm cancel-edit">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Replace cell content
        cell.classList.add('editing');
        cell.innerHTML = '';
        cell.appendChild(input);
        cell.appendChild(controls);
        
        // Focus input and select text
        input.focus();
        if (field === 'notes') {
            // For textarea, position cursor at the end
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (input.type === 'text') {
            input.select();
        }
        
        // Event listeners
        input.addEventListener('keydown', (e) => {
            if (field === 'notes') {
                // For notes (textarea), save on Ctrl+Enter
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.saveInlineEdit(cell, input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelInlineEdit(cell);
                }
                // Allow normal Enter for line breaks in textarea
            } else {
                // For other fields, save on Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.saveInlineEdit(cell, input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelInlineEdit(cell);
                }
            }
        });
        
        // Prevent event bubbling from input
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Better click outside handler - only save when clicking outside the cell
        this.currentJsonClickHandler = (e) => {
            // Don't trigger if clicking within the current editing cell
            if (cell.contains(e.target)) {
                return;
            }
            
            // Only trigger if clicking on another editable cell or completely outside the table
            const clickedCell = e.target.closest('td.editable');
            if (clickedCell && clickedCell !== cell) {
                // Clicking on another editable cell - save current and start editing the new one
                this.saveJsonCellEdit(cell, input.value);
            } else if (!e.target.closest('#jsonDataTable')) {
                // Clicking completely outside the table - save current edit
                this.saveJsonCellEdit(cell, input.value);
            }
        };
        
        // Add slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener('click', this.currentJsonClickHandler);
        }, 150);
    }

    saveJsonCellEdit(cell, newValue) {
        const field = cell.dataset.field;
        const index = parseInt(cell.dataset.index);
        
        // Validate input
        if (field === 'slide_number' && newValue && isNaN(newValue)) {
            this.showToast('Slide number must be a valid number', 'error');
            return;
        }
        
        if (field === 'start_time' || field === 'end_time') {
            if (newValue && this.parseTime(newValue) === null) {
                this.showToast('Invalid time format. Use HH:MM:SS.mmm', 'error');
                return;
            }
        }
        
        // Update data
        this.settingsState.currentEditingData[index][field] = newValue || '';
        
        // Clean up click handler
        if (this.currentJsonClickHandler) {
            document.removeEventListener('click', this.currentJsonClickHandler);
            this.currentJsonClickHandler = null;
        }
        
        // Restore cell
        this.restoreJsonCell(cell, newValue || '');
    }

    cancelJsonCellEdit(cell) {
        const originalValue = cell.dataset.originalValue || '';
        
        // Clean up click handler
        if (this.currentJsonClickHandler) {
            document.removeEventListener('click', this.currentJsonClickHandler);
            this.currentJsonClickHandler = null;
        }
        
        this.restoreJsonCell(cell, originalValue);
    }

    restoreJsonCell(cell, displayValue) {
        cell.classList.remove('editing');
        cell.innerHTML = displayValue;
        
        // Re-add click listener
        cell.addEventListener('click', (e) => this.startJsonCellEdit(e.target.closest('td')));
        
        // Remove stored values
        delete cell.dataset.originalValue;
    }

    addJsonSlide() {
        const newSlide = {
            slide_number: this.settingsState.currentEditingData.length + 1,
            slide_title: '',
            start_time: '00:00:00.000',
            end_time: '00:00:00.000',
            notes: ''
        };
        
        this.settingsState.currentEditingData.push(newSlide);
        this.renderJsonTable(this.settingsState.currentEditingData);
        this.showToast('Slide added', 'success');
    }

    duplicateJsonSlide(index) {
        const originalSlide = { ...this.settingsState.currentEditingData[index] };
        originalSlide.slide_number = parseInt(originalSlide.slide_number) + 0.5;
        this.settingsState.currentEditingData.splice(index + 1, 0, originalSlide);
        this.renderJsonTable(this.settingsState.currentEditingData);
        this.showToast('Slide duplicated', 'success');
    }

    deleteJsonSlide(index) {
        if (confirm('Are you sure you want to delete this slide?')) {
            this.settingsState.currentEditingData.splice(index, 1);
            this.renderJsonTable(this.settingsState.currentEditingData);
            this.showToast('Slide deleted', 'success');
        }
    }

    async saveJsonTableChanges() {
        if (!this.settingsState.currentEditingFile || !this.settingsState.selectedLecture) return;
        
        try {
            // Save to localStorage
            this.saveStoredRecord(
                this.settingsState.selectedLecture, 
                this.settingsState.currentEditingFile, 
                this.settingsState.currentEditingData
            );
            
            this.showToast('JSON file saved successfully!', 'success');
            this.closeJsonTableEditor();
            await this.loadJsonFileList();
            await this.updateHomeStats(); // Refresh stats
        } catch (error) {
            console.error('Error saving JSON file:', error);
            this.showToast('Failed to save file', 'error');
        }
    }

    closeJsonTableEditor() {
        const modal = document.getElementById('jsonTableModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.settingsState.currentEditingFile = null;
        this.settingsState.currentEditingData = null;
    }
    
    showJsonEditor(content) {
        const editorSection = document.getElementById('jsonEditorSection');
        const jsonEditor = document.getElementById('jsonEditor');
        
        if (editorSection && jsonEditor) {
            editorSection.style.display = 'block';
            jsonEditor.value = content;
            jsonEditor.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    hideJsonEditor() {
        const editorSection = document.getElementById('jsonEditorSection');
        if (editorSection) {
            editorSection.style.display = 'none';
        }
        this.settingsState.currentEditingFile = null;
    }
    
    async saveJsonChanges() {
        if (!this.settingsState.currentEditingFile || !this.settingsState.selectedLecture) return;
        
        const jsonEditor = document.getElementById('jsonEditor');
        if (!jsonEditor) return;
        
        try {
            // Validate JSON
            const jsonData = JSON.parse(jsonEditor.value);
            
            // Save to localStorage
            this.saveStoredRecord(this.settingsState.selectedLecture, this.settingsState.currentEditingFile, jsonData);
            
            this.showToast('JSON file saved successfully!', 'success');
            this.hideJsonEditor();
            await this.loadJsonFileList();
            await this.updateHomeStats(); // Refresh stats
        } catch (error) {
            console.error('Error saving JSON file:', error);
            if (error instanceof SyntaxError) {
                this.showToast('Invalid JSON format. Please fix syntax errors.', 'error');
            } else {
                this.showToast('Failed to save file', 'error');
            }
        }
    }
    
    cancelJsonEdit() {
        this.hideJsonEditor();
    }
    
    async downloadJsonFile(filename) {
        try {
            const response = await fetch(`/api/lectures/${this.settingsState.selectedLecture}/records/${filename}`);
            const data = await response.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('JSON file downloaded', 'success');
        } catch (error) {
            console.error('Error downloading JSON file:', error);
            this.showToast('Failed to download JSON file', 'error');
        }
    }
    
    async deleteJsonFile(filename) {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/lectures/${this.settingsState.selectedLecture}/records/${filename}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('JSON file deleted successfully', 'success');
                await this.loadJsonFileList();
                
                // Hide editor if we're editing this file
                if (this.settingsState.currentEditingFile === filename) {
                    this.hideJsonEditor();
                }
            } else {
                throw new Error('Failed to delete JSON file');
            }
        } catch (error) {
            console.error('Error deleting JSON file:', error);
            this.showToast('Failed to delete JSON file', 'error');
        }
    }
    
    async exportAllData() {
        try {
            const response = await fetch('/api/export/all');
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `slide_scribe_backup_${new Date().toISOString().split('T')[0]}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showToast('Data exported successfully', 'success');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Failed to export data', 'error');
        }
    }
    
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/import/all', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.showToast('Data imported successfully', 'success');
                // Refresh all data
                await this.loadLecturesForSettings();
                await this.loadJsonFileList();
            } else {
                throw new Error('Failed to import data');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.showToast('Failed to import data', 'error');
        } finally {
            event.target.value = '';
        }
    }
    
    async clearAllData() {
        const confirmation = prompt('Type "DELETE ALL" to confirm clearing all data:');
        if (confirmation !== 'DELETE ALL') {
            return;
        }
        
        try {
            const response = await fetch('/api/clear/all', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('All data cleared successfully', 'success');
                // Refresh all data
                await this.loadLecturesForSettings();
                this.settingsState.selectedLecture = '';
                document.getElementById('jsonLectureSelect').value = '';
                this.onJsonLectureSelectChange('');
            } else {
                throw new Error('Failed to clear data');
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showToast('Failed to clear data', 'error');
        }
    }

    setupSettingsListeners() {
        // Settings preferences
        const notificationToggle = document.getElementById('notificationToggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('change', (e) => this.updatePreference('notifications', e.target.checked));
        }
        
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => this.updatePreference('autoSave', e.target.checked));
        }
        
        const timerFormatSelect = document.getElementById('defaultTimerFormat');
        if (timerFormatSelect) {
            timerFormatSelect.addEventListener('change', (e) => this.updatePreference('timerFormat', e.target.value));
        }
        
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => this.updatePreference('darkMode', e.target.checked));
        }

        // Data management
        const exportAllDataBtn = document.getElementById('exportAllDataBtn');
        if (exportAllDataBtn) {
            exportAllDataBtn.addEventListener('click', () => this.exportAllData());
        }
        
        const importDataBtn = document.getElementById('importDataBtn');
        const importDataInput = document.getElementById('importDataInput');
        if (importDataBtn && importDataInput) {
            importDataBtn.addEventListener('click', () => importDataInput.click());
            importDataInput.addEventListener('change', (e) => this.importData(e));
        }
        
        const clearAllDataBtn = document.getElementById('clearAllDataBtn');
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        }

        // Lecture Management
        const addLectureBtn = document.getElementById('addLectureBtn');
        if (addLectureBtn) {
            addLectureBtn.addEventListener('click', () => this.handleAddLecture());
        }

        const newLectureName = document.getElementById('newLectureName');
        if (newLectureName) {
            newLectureName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddLecture();
                }
            });
        }
    }

    setupModalListeners() {
        // Modal controls
        const loginBtn = document.getElementById('loginBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.userState.isLoggedIn) {
                    this.logout();
                } else {
                    this.openModal();
                }
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking backdrop
        const modal = document.getElementById('loginModal');
        const modalBackdrop = modal?.querySelector('.modal-backdrop');
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => this.closeModal());
        }

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.authTab));
        });

        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // JSON Table Modal listeners
        const closeJsonTableBtn = document.getElementById('closeJsonTableBtn');
        const saveJsonTableBtn = document.getElementById('saveJsonTableBtn');
        const cancelJsonTableBtn = document.getElementById('cancelJsonTableBtn');
        const addSlideBtn = document.getElementById('addSlideBtn');

        if (closeJsonTableBtn) {
            closeJsonTableBtn.addEventListener('click', () => this.closeJsonTableEditor());
        }

        if (saveJsonTableBtn) {
            saveJsonTableBtn.addEventListener('click', () => this.saveJsonTableChanges());
        }

        if (cancelJsonTableBtn) {
            cancelJsonTableBtn.addEventListener('click', () => this.closeJsonTableEditor());
        }

        if (addSlideBtn) {
            addSlideBtn.addEventListener('click', () => this.addJsonSlide());
        }

        // Close JSON table modal when clicking backdrop
        const jsonTableModal = document.getElementById('jsonTableModal');
        const jsonTableBackdrop = jsonTableModal?.querySelector('.modal-backdrop');
        if (jsonTableBackdrop) {
            jsonTableBackdrop.addEventListener('click', () => this.closeJsonTableEditor());
        }

    }

    // User Authentication Methods (Updated to use backend API)
    
    checkLoginStatus() {
        const currentUser = localStorage.getItem('slide_scribe_current_user');
        if (currentUser) {
            this.userState.currentUser = JSON.parse(currentUser);
            this.userState.isLoggedIn = true;
            this.updateUserInterface();
        }
    }

    updateUserInterface() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.querySelector('.user-info span');
        
        if (this.userState.isLoggedIn && this.userState.currentUser) {
            // 로그인 버튼을 로그아웃 버튼으로 변경
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> 로그아웃';
                loginBtn.classList.remove('btn-outline');
                loginBtn.classList.add('btn-primary');
            }
            
            // 사용자 정보 업데이트
            if (userInfo) {
                userInfo.textContent = this.userState.currentUser.username;
            }
            
            // 사용자 설정 로드
            this.settingsState.preferences = this.getUserPreferences();
            this.loadPreferences();
            
            // 사용자별 데이터 새로고침
            this.refreshUserData();
        } else {
            // 로그인 상태로 리셋
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 로그인';
                loginBtn.classList.remove('btn-primary');
                loginBtn.classList.add('btn-outline');
            }
            
            if (userInfo) {
                userInfo.textContent = '게스트 사용자';
            }
            
            // 사용자별 데이터 정리
            this.clearUserData();
        }
    }

    async refreshUserData() {
        try {
            // 사용자 로그인에 의존하는 모든 데이터 새로고침
            await Promise.all([
                this.loadLectures(),
                this.loadLecturesForParser(),
                this.loadLecturesForSettings()
            ]);
            this.updateHomeStats();
        } catch (error) {
            console.error('사용자 데이터 새로고침 오류:', error);
        }
    }

    clearUserData() {
        // 현재 선택사항과 데이터 정리
        this.timerState.currentLecture = null;
        this.timerState.currentRecord = null;
        this.timerState.slides = [];
        this.homeState.stats = {
            totalLectures: 0,
            totalRecords: 0,
            totalSlides: 0,
            totalTime: 0
        };
        
        // UI 요소 정리
        const lectureSelect = document.getElementById('lectureSelect');
        if (lectureSelect) {
            lectureSelect.innerHTML = '<option value="">강의를 선택하세요...</option>';
        }
        
        const recordSelect = document.getElementById('recordSelect');
        if (recordSelect) {
            recordSelect.innerHTML = '<option value="new">새 기록 시작</option>';
        }
        
        // 통계 표시 업데이트
        this.updateStatsDisplay();
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showToast('모든 필드를 입력해주세요', 'error');
            return;
        }

        try {
            // 백엔드 API 호출로 로그인 처리
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showToast(data.detail || '로그인에 실패했습니다', 'error');
                return;
            }

            // 로그인 성공
            this.userState.currentUser = data.user;
            this.userState.isLoggedIn = true;
            
            // 로그인 상태를 로컬스토리지에 저장 (세션 유지용)
            localStorage.setItem('slide_scribe_current_user', JSON.stringify(this.userState.currentUser));
            
            this.updateUserInterface();
            this.closeModal();
            this.showToast(`환영합니다, ${data.user.username}님!`, 'success');
            
            // 폼 초기화
            document.getElementById('loginForm').reset();

        } catch (error) {
            console.error('Login error:', error);
            this.showToast('로그인 중 오류가 발생했습니다', 'error');
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !password || !confirmPassword) {
            this.showToast('모든 필드를 입력해주세요', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('비밀번호가 일치하지 않습니다', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('비밀번호는 최소 6자 이상이어야 합니다', 'error');
            return;
        }

        try {
            // 백엔드 API 호출로 회원가입 처리
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.showToast(data.detail || '회원가입에 실패했습니다', 'error');
                return;
            }

            // 회원가입 성공 후 자동 로그인
            this.userState.currentUser = data.user;
            this.userState.isLoggedIn = true;
            
            localStorage.setItem('slide_scribe_current_user', JSON.stringify(this.userState.currentUser));
            
            this.updateUserInterface();
            this.closeModal();
            this.showToast(`회원가입이 완료되었습니다! 환영합니다, ${username}님!`, 'success');
            
            // 폼 초기화
            document.getElementById('registerForm').reset();

        } catch (error) {
            console.error('Register error:', error);
            this.showToast('회원가입 중 오류가 발생했습니다', 'error');
        }
    }

    logout() {
        this.userState.currentUser = null;
        this.userState.isLoggedIn = false;
        
        localStorage.removeItem('slide_scribe_current_user');
        
        this.updateUserInterface();
        this.showToast('로그아웃되었습니다', 'info');
        
        // 홈 탭으로 이동
        this.switchTab('home');
    }

    // User-specific data storage methods
    getUserStorageKey(key) {
        const username = this.userState.currentUser?.username || 'guest';
        return `slide_scribe_${username}_${key}`;
    }

    getStoredLectures() {
        const key = this.getUserStorageKey('lectures');
        const lectures = localStorage.getItem(key);
        return lectures ? JSON.parse(lectures) : [];
    }

    saveStoredLectures(lectures) {
        const key = this.getUserStorageKey('lectures');
        localStorage.setItem(key, JSON.stringify(lectures));
    }

    getStoredRecords(lecture) {
        const key = this.getUserStorageKey(`records_${lecture}`);
        const records = localStorage.getItem(key);
        return records ? JSON.parse(records) : {};
    }

    saveStoredRecord(lecture, recordName, data) {
        const records = this.getStoredRecords(lecture);
        records[recordName] = data;
        const key = this.getUserStorageKey(`records_${lecture}`);
        localStorage.setItem(key, JSON.stringify(records));
    }

    deleteStoredRecord(lecture, recordName) {
        const records = this.getStoredRecords(lecture);
        delete records[recordName];
        const key = this.getUserStorageKey(`records_${lecture}`);
        localStorage.setItem(key, JSON.stringify(records));
    }

    deleteStoredLecture(lecture) {
        const lectures = this.getStoredLectures();
        const updatedLectures = lectures.filter(l => l !== lecture);
        this.saveStoredLectures(updatedLectures);
        
        // 해당 강의의 모든 기록도 삭제
        const key = this.getUserStorageKey(`records_${lecture}`);
        localStorage.removeItem(key);
    }

    getUserPreferences() {
        const key = this.getUserStorageKey('preferences');
        const prefs = localStorage.getItem(key);
        return prefs ? JSON.parse(prefs) : {
            darkMode: false,
            autoSave: true,
            timerFormat: 'hmsms',
            notifications: true
        };
    }

    saveUserPreferences(preferences) {
        const key = this.getUserStorageKey('preferences');
        localStorage.setItem(key, JSON.stringify(preferences));
    }

    async loadTimerRecordPreview() {
        try {
            console.log('=== loadTimerRecordPreview ===');
            console.log('selectedLecture:', this.srtParser.selectedLecture);
            console.log('selectedRecord:', this.srtParser.selectedRecord);
            
            if (!this.srtParser.selectedLecture || !this.srtParser.selectedRecord) {
                console.log('Missing lecture or record selection');
                this.updateTimerPreview(null);
                return;
            }
            
            // Use localStorage instead of API
            const records = this.getStoredRecords(this.srtParser.selectedLecture);
            console.log('Available records for lecture:', Object.keys(records));
            
            const data = records[this.srtParser.selectedRecord];
            console.log('Retrieved record data:', data);
            
            if (data && Array.isArray(data)) {
                this.updateTimerPreview(data);
                console.log('Timer preview updated successfully');
            } else {
                console.log('No data found for record:', this.srtParser.selectedRecord);
                this.updateTimerPreview(null);
            }
            
        } catch (error) {
            console.error('Error loading timer record:', error);
            this.updateTimerPreview(null);
            this.showToast('Failed to load timer record', 'error');
        }
    }

    updateSrtPreview(srtContent) {
        const preview = document.getElementById('srtPreview');
        if (!preview) return;
        
        if (!srtContent) {
            preview.innerHTML = 'Upload an SRT file to preview';
            return;
        }
        
        // Parse SRT content to show preview
        const lines = srtContent.split('\n');
        const subtitles = [];
        let currentSubtitle = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                if (currentSubtitle.text) {
                    subtitles.push(currentSubtitle);
                    currentSubtitle = {};
                }
                continue;
            }
            
            if (/^\d+$/.test(line)) {
                currentSubtitle.index = parseInt(line);
            } else if (/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line)) {
                const [start, end] = line.split(' --> ');
                currentSubtitle.start = start;
                currentSubtitle.end = end;
            } else if (currentSubtitle.start && !currentSubtitle.text) {
                currentSubtitle.text = line;
            }
        }
        
        // Add last subtitle if exists
        if (currentSubtitle.text) {
            subtitles.push(currentSubtitle);
        }
        
        const previewSubtitles = subtitles.slice(0, 3); // Show first 3 subtitles
        
        const html = `
            <div class="preview-info">
                <strong>File:</strong> ${this.srtParser.selectedFile?.name || 'Unknown'}<br>
                <strong>Subtitles:</strong> ${subtitles.length}<br>
                <strong>Size:</strong> ${this.srtParser.selectedFile ? (this.srtParser.selectedFile.size / 1024).toFixed(2) + ' KB' : 'Unknown'}
            </div>
            <div class="preview-subtitles">
                ${previewSubtitles.map(subtitle => `
                    <div class="preview-subtitle">
                        <span class="subtitle-time">${subtitle.start} → ${subtitle.end}</span><br>
                        <span class="subtitle-text">${subtitle.text}</span>
                    </div>
                `).join('')}
                ${subtitles.length > 3 ? `<div class="preview-more">... and ${subtitles.length - 3} more subtitles</div>` : ''}
            </div>
        `;
        
        preview.innerHTML = html;
    }

    async updateHomeStats() {
        try {
            // 저장된 강의와 기록 데이터를 기반으로 통계 계산
            const lectures = this.getStoredLectures();
            let totalRecords = 0;
            let totalSlides = 0;
            
            // 각 강의의 기록을 확인하여 통계 계산
            lectures.forEach(lecture => {
                const records = this.getStoredRecords(lecture);
                const recordNames = Object.keys(records);
                totalRecords += recordNames.length;
                
                // 각 기록의 슬라이드 수 계산
                recordNames.forEach(recordName => {
                    const recordData = records[recordName];
                    if (Array.isArray(recordData)) {
                        totalSlides += recordData.length;
                    }
                });
            });
            
            // DOM 업데이트
            const totalLecturesEl = document.getElementById('totalLectures');
            const totalRecordsEl = document.getElementById('totalRecords');
            const totalSlidesEl = document.getElementById('totalSlides');
            
            if (totalLecturesEl) totalLecturesEl.textContent = lectures.length;
            if (totalRecordsEl) totalRecordsEl.textContent = totalRecords;
            if (totalSlidesEl) totalSlidesEl.textContent = totalSlides;
            
        } catch (error) {
            console.error('Error updating home stats:', error);
        }
    }

    // 슬라이드 번호 증감 함수들
    incrementSlide() {
        const slideNumber = document.getElementById('slideNumber');
        if (slideNumber) {
            const currentValue = parseInt(slideNumber.value) || 1;
            slideNumber.value = currentValue + 1;
            this.timerState.currentSlide = currentValue + 1;
        }
    }

    decrementSlide() {
        const slideInput = document.getElementById('currentSlideInput');
        if (slideInput) {
            const currentValue = parseInt(slideInput.value) || 1;
            if (currentValue > 1) {
                slideInput.value = currentValue - 1;
                this.timerState.currentSlide = currentValue - 1;
            }
        }
    }
    
    // SRT Results editing functionality
    setupResultsEditingListeners() {
        // Listen for changes in editable elements
        const editableElements = document.querySelectorAll('.slide-title-editable, .slide-notes-editable, .result-text-area');
        editableElements.forEach(element => {
            element.addEventListener('input', (e) => {
                this.updateResultData(e.target);
            });
            
            element.addEventListener('blur', (e) => {
                this.saveResultChanges(e.target);
            });
        });
    }
    
    updateResultData(element) {
        const slideElement = element.closest('.result-slide');
        const slideIndex = parseInt(slideElement.dataset.slideIndex);
        const field = element.dataset.field;
        
        if (this.srtParser.parseResults && this.srtParser.parseResults[slideIndex]) {
            const value = element.tagName === 'TEXTAREA' ? element.value : element.textContent;
            
            if (field === 'title') {
                this.srtParser.parseResults[slideIndex].slide_title = value;
            } else if (field === 'notes') {
                // Remove "Notes: " prefix if present
                const notesText = value.replace(/^Notes:\s*/, '');
                this.srtParser.parseResults[slideIndex].notes = notesText;
            } else if (field === 'text') {
                this.srtParser.parseResults[slideIndex].text = value;
                // Update copy button data-text attribute
                const copyButton = slideElement.querySelector('.copy-button');
                if (copyButton) {
                    copyButton.dataset.text = value.replace(/"/g, '&quot;');
                }
            }
        }
    }
    
    saveResultChanges(element) {
        // Visual feedback for saved changes
        element.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 1000);
    }
    
    copyText(button) {
        // Get the actual text from the textarea next to the button
        const textarea = button.parentElement.querySelector('.result-text-area');
        const text = textarea ? textarea.value : button.dataset.text;
        
        // Use the Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showCopyFeedback(button, 'Copied!');
            }).catch(() => {
                this.fallbackCopyText(text, button);
            });
        } else {
            this.fallbackCopyText(text, button);
        }
    }
    
    fallbackCopyText(text, button) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyFeedback(button, 'Copied!');
        } catch (err) {
            this.showCopyFeedback(button, 'Failed');
        }
        
        document.body.removeChild(textArea);
    }
    
    showCopyFeedback(button, message) {
        // Store original text if not already stored
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
        
        const originalText = button.dataset.originalText;
        button.innerHTML = `<i class="fas fa-check"></i> ${message}`;
        
        if (message === 'Copied!') {
            button.classList.add('success');
        } else {
            button.style.background = '#dc3545';
        }
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('success');
            button.style.background = '';
        }, 2000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SlideScribeApp();
    // window.app.init(); 중복 제거 - constructor에서 이미 호출됨
    
    // Load saved dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = darkMode;
    }
    if (darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
}); 