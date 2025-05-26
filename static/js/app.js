class SlideScribeApp {
    constructor() {
        this.activeTab = 'home';
        this.currentStep = 'lecture-selection';
        this.timerState = {
            isRunning: false,
            baseTime: 0,  // 기준 시간 (밀리초)
            pausedTime: 0,  // 일시정지된 누적 시간
            lastStartTime: null,  // 마지막 시작 시간
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
            currentUser: null,
            users: this.getStoredUsers()
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
            parserLectureSelect.addEventListener('change', (e) => this.onParserLectureSelectChange(e.target.value));
        }
        
        const selectParserLectureBtn = document.getElementById('selectParserLectureBtn');
        if (selectParserLectureBtn) {
            selectParserLectureBtn.addEventListener('click', () => this.proceedToParserRecordSelection());
        }
        
        // Record selection
        const parserRecordSelect = document.getElementById('parserRecordSelect');
        if (parserRecordSelect) {
            parserRecordSelect.addEventListener('change', (e) => this.onParserRecordSelectChange(e.target.value));
        }
        
        const selectParserRecordBtn = document.getElementById('selectParserRecordBtn');
        if (selectParserRecordBtn) {
            selectParserRecordBtn.addEventListener('click', () => this.proceedToSrtFileUpload());
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
            srtUploadArea.addEventListener('click', () => srtFileInput.click());
            
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
            uploadSrtBtn.addEventListener('click', () => this.proceedToParserInterface());
        }
        
        // Parse files button
        const parseFilesBtn = document.getElementById('parseFilesBtn');
        if (parseFilesBtn) {
            parseFilesBtn.addEventListener('click', () => this.parseFiles());
        }
        
        // Export results button
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        if (exportResultsBtn) {
            exportResultsBtn.addEventListener('click', () => this.exportSrtResults());
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
            this.initializeSettingsTab();
        }
    }

    initializeTimerTab() {
        // Reset to initial state if not already set up
        if (this.currentStep !== 'timer') {
            this.resetToLectureSelection();
        }
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
        statusEl.textContent = status;
        
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
                        <i class="fas fa-pencil-alt edit-indicator"></i>
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
            this.showToast('Please select a lecture first', 'error');
            return;
        }

        if (this.slides.length === 0) {
            this.showToast('No slides to save', 'error');
            return;
        }

        try {
            // Generate record name if not set
            let recordName = this.timerState.currentRecord;
            if (!recordName || recordName === 'new') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                recordName = `session_${timestamp}`;
                this.timerState.currentRecord = recordName;
                this.currentRecord = recordName; // Keep in sync
            }

            // Save to localStorage
            this.saveStoredRecord(this.timerState.currentLecture, recordName, this.slides);
            
            // Update record select to show the saved record
            await this.loadRecords();
            const recordSelect = document.getElementById('recordSelect');
            if (recordSelect) {
                recordSelect.value = recordName;
            }

            this.showToast(`Records saved as "${recordName}"`, 'success');
        } catch (error) {
            console.error('Error saving records:', error);
            this.showToast('Failed to save records', 'error');
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
            // Use localStorage instead of API for local development
            const lectures = this.getStoredLectures();
            const lectureSelect = document.getElementById('lectureSelect');
            
            if (lectureSelect) {
                lectureSelect.innerHTML = '<option value="">Choose a lecture...</option>';
                lectures.forEach(lecture => {
                    const option = document.createElement('option');
                    option.value = lecture;
                    option.textContent = lecture;
                    lectureSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading lectures:', error);
            this.showToast('Failed to load lectures', 'error');
        }
    }

    async onLectureSelectChange(lectureName) {
        this.currentLecture = lectureName;
        this.timerState.currentLecture = lectureName; // Add this line to sync both variables
        const selectBtn = document.getElementById('selectLectureBtn');
        selectBtn.disabled = !lectureName;
        
        if (lectureName) {
            this.loadRecords(); // Load records for this lecture
        }
    }

    async loadRecords() {
        if (!this.timerState.currentLecture) {
            this.clearRecordSelect();
            return;
        }

        try {
            // Use localStorage instead of API
            const records = this.getStoredRecords(this.timerState.currentLecture);
            const recordNames = Object.keys(records);
            
            const recordSelect = document.getElementById('recordSelect');
            recordSelect.innerHTML = '<option value="new">새 기록 시작</option>';
            
            recordNames.forEach(recordName => {
                const option = document.createElement('option');
                option.value = recordName;
                option.textContent = recordName;
                recordSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading records:', error);
            this.showToast('Failed to load records', 'error');
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

    async loadRecordContent(recordFile) {
        try {
            console.log('=== loadRecordContent ===');
            console.log(`Loading record "${recordFile}" for lecture "${this.timerState.currentLecture}"`);
            
            if (!this.timerState.currentLecture) {
                throw new Error('No lecture selected');
            }
            
            // Handle "new" record case - don't try to load anything
            if (recordFile === 'new') {
                console.log('Starting new session - no content to load');
                this.slides = [];
                this.timerState.slides = [];
                this.timerState.currentRecord = recordFile;
                this.updateSlidesTable();
                this.updateRecordCount();
                // No toast message for new sessions since it's expected behavior
                return;
            }
            
            // Load from localStorage
            const records = this.getStoredRecords(this.timerState.currentLecture);
            console.log('Available records:', Object.keys(records));
            
            const data = records[recordFile];
            console.log('Retrieved data:', data);
            
            if (data && Array.isArray(data)) {
                this.slides = data;
                this.timerState.slides = data; // Keep both in sync
                this.timerState.currentRecord = recordFile;
                this.updateSlidesTable();
                this.updateRecordCount();
                this.showToast(`Record "${recordFile}" loaded (${data.length} slides)`, 'success');
                console.log('Record loaded successfully:', data);
            } else if (!data) {
                // Record not found - this is valid, just clear slides
                console.log(`Record "${recordFile}" not found, starting with empty slides`);
                this.slides = [];
                this.timerState.slides = [];
                this.timerState.currentRecord = recordFile;
                this.updateSlidesTable();
                this.updateRecordCount();
                this.showToast(`Started new record "${recordFile}"`, 'info');
            } else {
                throw new Error(`Invalid record data format for "${recordFile}"`);
            }
        } catch (error) {
            console.error('Error loading record content:', error);
            this.showToast(`Failed to load record content: ${error.message}`, 'error');
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
        document.getElementById('loginModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('loginModal').classList.remove('active');
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
        
        // Update selection info
        const recordText = this.currentRecord === 'new' ? 'New Session' : this.currentRecord;
        document.getElementById('selectedRecord').textContent = recordText;
        
        // Load record content if existing record selected
        if (this.currentRecord !== 'new') {
            console.log('Loading existing record:', this.currentRecord);
            await this.loadRecordContent(this.currentRecord);
        } else {
            console.log('Starting new session - clearing slides');
            // For new records, clear slides
            this.slides = [];
            this.timerState.slides = [];
            this.updateSlidesTable();
            this.updateRecordCount();
        }
        
        // Animate transition
        await this.animateStepTransition('recordSelectionStep', 'timerInterface');
        this.currentStep = 'timer';
        
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
        
        // Update selection info
        document.getElementById('selectedRecord').textContent = '-';
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
            // Use localStorage instead of API
            const lectures = this.getStoredLectures();
            
            const select = document.getElementById('parserLectureSelect');
            if (select) {
                select.innerHTML = '<option value="">Choose a lecture...</option>';
                
                lectures.forEach(lecture => {
                    const option = document.createElement('option');
                    option.value = lecture;
                    option.textContent = lecture;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading lectures for SRT parser:', error);
            this.showToast('Failed to load lectures', 'error');
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
                    <span class="meta-item"><i class="fas fa-clock"></i> ${new Date(data.metadata.processed_at).toLocaleString()}</span>
                </div>
            </div>
            <div class="results-content">
                ${data.results.map((result, index) => `
                    <div class="result-slide" data-slide-index="${index}">
                        <div class="slide-header">
                            <div class="slide-info">
                                <span class="slide-number">Slide ${result.slide_number}</span>
                                <span class="slide-title">${result.slide_title || 'Untitled'}</span>
                            </div>
                            <div class="slide-time">
                                <span class="time-range">${result.start_time} → ${result.end_time}</span>
                            </div>
                        </div>
                        <div class="slide-content">
                            ${result.notes ? `<div class="slide-notes"><strong>Notes:</strong> ${result.notes}</div>` : ''}
                            <div class="slide-text">
                                <label>Extracted Text:</label>
                                <textarea class="result-text-area" rows="4" readonly>${result.text}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
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

    onParserLectureSelectChange(lectureName) {
        this.srtParser.selectedLecture = lectureName;
        const selectBtn = document.getElementById('selectParserLectureBtn');
        selectBtn.disabled = !lectureName;
    }
    
    async proceedToParserRecordSelection() {
        if (!this.srtParser.selectedLecture) return;
        
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
    }
    
    async loadRecordsForParser() {
        if (!this.srtParser.selectedLecture) return;

        try {
            // Use localStorage instead of API
            const records = this.getStoredRecords(this.srtParser.selectedLecture);
            const recordNames = Object.keys(records);
            
            const select = document.getElementById('parserRecordSelect');
            select.innerHTML = '<option value="">Choose a timer record...</option>';
            
            recordNames.forEach(record => {
                const option = document.createElement('option');
                option.value = record;
                option.textContent = record;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load records:', error);
            this.showToast('Failed to load records', 'error');
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
            // Get timer record from localStorage
            const records = this.getStoredRecords(this.srtParser.selectedLecture);
            const timerRecord = records[this.srtParser.selectedRecord];
            
            if (!timerRecord || !Array.isArray(timerRecord)) {
                throw new Error('Timer record not found or invalid format');
            }
            
            // Parse SRT content
            const subtitles = this.parseSrtContent(srtContent);
            
            // Match timer records with SRT subtitles
            const results = this.matchTimerWithSrt(timerRecord, subtitles);
            
            // Display results
            this.displayLocalResults(results);
            
            this.showToast(`Parsing completed! ${results.length} slides processed`, 'success');
            
        } catch (error) {
            console.error('Error parsing files locally:', error);
            this.showToast(error.message || 'Failed to parse files', 'error');
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
                    <span class="meta-item"><i class="fas fa-file"></i> ${this.srtParser.selectedFile.name}</span>
                </div>
            </div>
            <div class="results-content">
                ${results.map((result, index) => `
                    <div class="result-slide" data-slide-index="${index}">
                        <div class="slide-header">
                            <div class="slide-info">
                                <span class="slide-number">Slide ${result.slide_number}</span>
                                <span class="slide-title">${result.slide_title}</span>
                            </div>
                            <div class="slide-time">
                                <span class="time-range">${result.start_time} → ${result.end_time}</span>
                                <small class="subtitle-count">${result.matched_subtitles} subtitles</small>
                            </div>
                        </div>
                        <div class="slide-content">
                            ${result.notes ? `<div class="slide-notes"><strong>Notes:</strong> ${result.notes}</div>` : ''}
                            <div class="slide-text">
                                <label>Extracted Text:</label>
                                <textarea class="result-text-area" rows="4" readonly>${result.text}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
        
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
        console.log('Setting up home listeners...'); // 확인용 로그 추가
        
        // Add lecture functionality
        const saveLectureBtn = document.getElementById('saveLectureBtn');
        const newLectureName = document.getElementById('newLectureName');
        const addLectureQuick = document.getElementById('addLectureQuick');

        if (saveLectureBtn) {
            saveLectureBtn.addEventListener('click', () => {
                this.addLectureFromHome();
            });
        }

        if (newLectureName) {
            newLectureName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addLectureFromHome();
                }
            });
        }

        if (addLectureQuick) {
            addLectureQuick.addEventListener('click', () => {
                this.showAddLectureDialog();
            });
        }

        // JSON file management - 새로 구현
        this.setupJsonFileManagement();
    }

    setupJsonFileManagement() {
        const jsonLectureSelect = document.getElementById('jsonLectureSelect');
        const jsonFileInput = document.getElementById('jsonFileInput');
        const jsonUploadArea = document.getElementById('jsonUploadArea');
        const uploadJsonBtn = document.getElementById('uploadJsonBtn');
        
        // 강의 선택 이벤트
        if (jsonLectureSelect) {
            jsonLectureSelect.addEventListener('change', (e) => {
                const selectedLecture = e.target.value;
                this.homeState.selectedJsonLecture = selectedLecture;
                
                const uploadSection = document.getElementById('jsonUploadSection');
                const fileSection = document.getElementById('jsonFileSection');
                
                if (selectedLecture) {
                    if (uploadSection) uploadSection.style.display = 'block';
                    if (fileSection) fileSection.style.display = 'block';
                    this.loadJsonFiles(selectedLecture);
                    // 강의 변경 시 업로드 영역 리셋
                    this.resetJsonUploadArea();
                } else {
                    if (uploadSection) uploadSection.style.display = 'none';
                    if (fileSection) fileSection.style.display = 'none';
                }
            });
        }
        
        // 파일 선택 이벤트
        if (jsonFileInput) {
            jsonFileInput.addEventListener('change', (e) => this.handleJsonFileSelect(e));
        }
        
        // 드래그 앤 드롭 - SRT Parser와 완전히 동일하게
        if (jsonUploadArea) {
            // 클릭해서 파일 선택
            jsonUploadArea.addEventListener('click', () => jsonFileInput.click());

            // 드래그 오버
            jsonUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                jsonUploadArea.classList.add('drag-over');
            });

            // 드래그 떠남
            jsonUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                jsonUploadArea.classList.remove('drag-over');
            });

            // 파일 드롭
            jsonUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                jsonUploadArea.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleJsonFileSelect({ target: { files } });
                }
            });
        }

        // 업로드 버튼
        if (uploadJsonBtn) {
            uploadJsonBtn.addEventListener('click', () => {
                this.handleJsonUpload();
            });
        }
    }

    handleJsonFileSelect(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        // 파일 타입 검증 - SRT Parser와 동일한 방식
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showToast('Please select a valid JSON file', 'error');
            return;
        }
        
        // 강의 선택 확인
        if (!this.homeState.selectedJsonLecture) {
            this.showToast('Please select a lecture first', 'error');
            return;
        }
        
        // 파일 저장
        this.homeState.selectedJsonFile = file;
        
        // UI 업데이트 - SRT Parser와 완전히 동일한 방식
        const uploadArea = document.getElementById('jsonUploadArea');
        const uploadBtn = document.getElementById('uploadJsonBtn');
        
        if (uploadArea) {
            uploadArea.classList.add('file-selected');
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-file-code"></i>
                </div>
                <div class="upload-text">
                    <h5>${file.name}</h5>
                    <p>File selected successfully</p>
                    <small>Size: ${(file.size / 1024).toFixed(2)} KB</small>
                </div>
            `;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Upload JSON File';
        }
        
        this.showToast('JSON file selected successfully', 'success');
    }

    async handleJsonUpload() {
        const file = this.homeState.selectedJsonFile;
        const selectedLecture = this.homeState.selectedJsonLecture;
        
        if (!file || !selectedLecture) {
            this.showToast('Please select a file and lecture', 'error');
            return;
        }
        
        try {
            const content = await this.readFileContent(file);
            const jsonData = JSON.parse(content);
            
            if (!Array.isArray(jsonData)) {
                throw new Error('JSON file must contain an array of slides');
            }
            
            // localStorage에 저장
            const recordName = file.name.replace('.json', '');
            this.saveStoredRecord(selectedLecture, recordName, jsonData);
            
            this.showToast(`File "${file.name}" uploaded successfully!`, 'success');
            
            // UI 리셋
            this.resetJsonUploadArea();
            
            // 파일 목록 새로고침
            this.loadJsonFiles(selectedLecture);
            
            // 대시보드 통계 새로고침
            this.loadDashboardStats();
            
        } catch (error) {
            console.error('JSON upload error:', error);
            if (error instanceof SyntaxError) {
                this.showToast('Invalid JSON file format', 'error');
            } else {
                this.showToast('Failed to upload file: ' + error.message, 'error');
            }
        }
    }

    resetJsonUploadArea() {
        const uploadArea = document.getElementById('jsonUploadArea');
        const uploadBtn = document.getElementById('uploadJsonBtn');
        const fileInput = document.getElementById('jsonFileInput');
        
        // 선택된 파일 초기화
        this.homeState.selectedJsonFile = null;
        
        if (fileInput) {
            fileInput.value = '';
        }
        
        if (uploadArea) {
            uploadArea.classList.remove('file-selected', 'drag-over');
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <div class="upload-text">
                    <h5>JSON 파일을 여기에 드래그하세요</h5>
                    <p>또는 <span class="upload-link">browse files</span></p>
                    <small>JSON 파일만 허용됩니다</small>
                </div>
            `;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> JSON 파일 업로드';
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    loadJsonFiles(lectureName) {
        const records = this.getStoredRecords(lectureName);
        const jsonFileList = document.getElementById('jsonFileList');
        
        if (!jsonFileList) return;
        
        if (!records || Object.keys(records).length === 0) {
            jsonFileList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-code"></i>
                    <p>이 강의에 JSON 파일이 없습니다</p>
                </div>
            `;
            return;
        }
        
        const recordNames = Object.keys(records);
        jsonFileList.innerHTML = recordNames.map(recordName => {
            const data = records[recordName];
            const slideCount = Array.isArray(data) ? data.length : 0;
            
            return `
                <div class="json-file-item">
                    <div class="json-file-info">
                        <div class="json-file-icon"><i class="fas fa-file-code"></i></div>
                        <div class="json-file-details">
                            <div class="json-file-name">${recordName}</div>
                            <div class="json-file-meta">${slideCount} slides</div>
                        </div>
                    </div>
                    <div class="json-file-actions">
                        <button class="btn btn-sm btn-outline" onclick="app.downloadRecord('${lectureName}', '${recordName}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteRecord('${lectureName}', '${recordName}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    downloadRecord(lectureName, recordName) {
        const records = this.getStoredRecords(lectureName);
        const data = records[recordName];
        
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${recordName}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    deleteRecord(lectureName, recordName) {
        if (confirm(`"${recordName}" 기록을 삭제하시겠습니까?`)) {
            this.deleteStoredRecord(lectureName, recordName);
            this.loadJsonFiles(lectureName);
            this.showToast('기록이 삭제되었습니다', 'success');
        }
    }

    async loadLecturesForSettings() {
        const lectures = this.getStoredLectures();
        const jsonLectureSelect = document.getElementById('jsonLectureSelect');
        
        if (jsonLectureSelect) {
            jsonLectureSelect.innerHTML = '<option value="">강의를 선택하세요</option>';
            lectures.forEach(lecture => {
                const option = document.createElement('option');
                option.value = lecture;
                option.textContent = lecture;
                jsonLectureSelect.appendChild(option);
            });
        }
    }

    async initializeHomeTab() {
        console.log('Initializing Home tab...');
        await this.loadDashboardStats();
        await this.loadLectureList();
        await this.loadRecentActivity();
        await this.loadLecturesForSettings(); // Load lectures for JSON management
    }

    async initializeSettingsTab() {
        console.log('Initializing Settings tab...');
        this.loadPreferences();
    }

    async loadDashboardStats() {
        try {
            // Try to get stats from API first
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.homeState.stats = stats;
            } else {
                // Fallback to manual calculation
                await this.calculateStatsManually();
            }
            this.updateStatsDisplay();
        } catch (error) {
            console.warn('Could not load stats from API, calculating manually:', error);
            await this.calculateStatsManually();
            this.updateStatsDisplay();
        }
    }

    async calculateStatsManually() {
        try {
            // Get lectures
            const lecturesResponse = await fetch('/api/lectures');
            const lectures = lecturesResponse.ok ? await lecturesResponse.json() : [];
            
            let totalRecords = 0;
            let totalSlides = 0;
            let totalTimeMs = 0;

            // Calculate stats for each lecture
            for (const lecture of lectures) {
                try {
                    const recordsResponse = await fetch(`/api/lectures/${encodeURIComponent(lecture)}/records`);
                    if (recordsResponse.ok) {
                        const records = await recordsResponse.json();
                        totalRecords += records.length;

                        // Load each record to count slides and time
                        for (const record of records) {
                            try {
                                const recordResponse = await fetch(`/api/lectures/${encodeURIComponent(lecture)}/records/${encodeURIComponent(record)}`);
                                if (recordResponse.ok) {
                                    const recordData = await recordResponse.json();
                                    if (Array.isArray(recordData)) {
                                        totalSlides += recordData.length;
                                        
                                        // Calculate total time from end_time of last slide
                                        const lastSlide = recordData[recordData.length - 1];
                                        if (lastSlide && lastSlide.end_time) {
                                            const endTimeMs = this.parseTime(lastSlide.end_time);
                                            totalTimeMs = Math.max(totalTimeMs, endTimeMs);
                                        }
                                    }
                                }
                            } catch (recordError) {
                                console.warn(`Error loading record ${record}:`, recordError);
                            }
                        }
                    }
                } catch (lectureError) {
                    console.warn(`Error loading records for lecture ${lecture}:`, lectureError);
                }
            }

            this.homeState.stats = {
                totalLectures: lectures.length,
                totalRecords,
                totalSlides,
                totalTime: totalTimeMs
            };
        } catch (error) {
            console.error('Error calculating stats manually:', error);
            this.homeState.stats = {
                totalLectures: 0,
                totalRecords: 0,
                totalSlides: 0,
                totalTime: 0
            };
        }
    }

    updateStatsDisplay() {
        const elements = {
            totalLectures: document.getElementById('totalLectures'),
            totalRecords: document.getElementById('totalRecords'),
            totalSlides: document.getElementById('totalSlides'),
            totalTime: document.getElementById('totalTime')
        };

        if (elements.totalLectures) elements.totalLectures.textContent = this.homeState.stats.totalLectures;
        if (elements.totalRecords) elements.totalRecords.textContent = this.homeState.stats.totalRecords;
        if (elements.totalSlides) elements.totalSlides.textContent = this.homeState.stats.totalSlides;
        if (elements.totalTime) elements.totalTime.textContent = this.formatDuration(this.homeState.stats.totalTime);
    }

    async loadLectureList() {
        try {
            // Use localStorage instead of API
            const lectures = this.getStoredLectures();
            const lectureGrid = document.getElementById('lectureGrid');
            
            if (!lectureGrid) return;
            
            if (lectures.length === 0) {
                lectureGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-university"></i>
                        <p>No lectures found. Add your first lecture to get started!</p>
                    </div>
                `;
                return;
            }
            
            lectureGrid.innerHTML = lectures.map(lecture => `
                <div class="lecture-item">
                    <div class="lecture-info">
                        <h4>${lecture}</h4>
                        <small>Click to manage</small>
                    </div>
                    <div class="lecture-actions">
                        <button class="btn btn-sm btn-danger" onclick="app.deleteLecture('${lecture}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
            
            this.homeState.lectures = lectures;
        } catch (error) {
            console.error('Error loading lecture list:', error);
            this.showToast('Failed to load lectures', 'error');
        }
    }

    async loadRecentActivity() {
        // For now, show a simple placeholder
        // In a real app, this would load from an activity log
        const activityList = document.getElementById('recentActivity');
        if (activityList) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>No recent activity</p>
                </div>
            `;
        }
    }

    formatDuration(ms) {
        if (ms === 0) return '0h';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
    }

    showAddLectureDialog() {
        const input = document.getElementById('newLectureName');
        if (input) {
            input.focus();
        }
    }

    toggleAddLectureForm() {
        // Simple implementation - could be expanded
        const input = document.getElementById('newLectureName');
        if (input) {
            input.style.display = input.style.display === 'none' ? 'block' : 'none';
        }
    }

    async addLectureFromHome() {
        const input = document.getElementById('newLectureName');
        const lectureName = input?.value.trim();
        
        if (!lectureName) {
            this.showToast('Please enter a lecture name', 'error');
            return;
        }

        try {
            // Add to localStorage
            const lectures = this.getStoredLectures();
            
            if (lectures.includes(lectureName)) {
                this.showToast('Lecture already exists', 'error');
                return;
            }
            
            lectures.push(lectureName);
            this.saveStoredLectures(lectures);
            
            // Refresh lecture lists in all tabs
            await this.loadLectures();
            await this.loadLecturesForParser();
            await this.loadLectureList();
            
            if (input) {
                input.value = '';
            }
            this.showToast(`Lecture "${lectureName}" added successfully`, 'success');
        } catch (error) {
            console.error('Error adding lecture:', error);
            this.showToast('Failed to add lecture', 'error');
        }
    }

    async deleteLecture(lectureName) {
        if (!confirm(`Are you sure you want to delete "${lectureName}" and all its records?`)) {
            return;
        }

        try {
            this.deleteStoredLecture(lectureName);
            
            // Refresh all relevant displays
            await this.loadLectureList();
            await this.loadLectures();
            await this.loadLecturesForParser();
            await this.loadDashboardStats();
            
            this.showToast(`Lecture "${lectureName}" deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting lecture:', error);
            this.showToast('Failed to delete lecture', 'error');
        }
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
                await this.loadDashboardStats(); // Refresh stats
            
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
            modal.classList.add('active');
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
            await this.loadDashboardStats(); // Refresh stats
        } catch (error) {
            console.error('Error saving JSON file:', error);
            this.showToast('Failed to save file', 'error');
        }
    }

    closeJsonTableEditor() {
        const modal = document.getElementById('jsonTableModal');
        if (modal) {
            modal.classList.remove('active');
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
            await this.loadDashboardStats(); // Refresh stats
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

    // User Authentication Methods
    getStoredUsers() {
        const users = localStorage.getItem('slide_scribe_users');
        return users ? JSON.parse(users) : [];
    }

    saveStoredUsers(users) {
        localStorage.setItem('slide_scribe_users', JSON.stringify(users));
    }

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
            // Update login button to logout
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                loginBtn.classList.remove('btn-outline');
                loginBtn.classList.add('btn-primary');
            }
            
            // Update user info
            if (userInfo) {
                userInfo.textContent = this.userState.currentUser.username;
            }
            
            // Load user preferences
            this.settingsState.preferences = this.getUserPreferences();
            this.loadPreferences();
            
            // Refresh user-specific data
            this.refreshUserData();
        } else {
            // Reset to login state
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                loginBtn.classList.remove('btn-primary');
                loginBtn.classList.add('btn-outline');
            }
            
            if (userInfo) {
                userInfo.textContent = 'Guest User';
            }
            
            // Clear user-specific data
            this.clearUserData();
        }
    }

    async refreshUserData() {
        try {
            // Refresh all data that depends on user login
            await Promise.all([
                this.loadLectures(),
                this.loadLectureList(),
                this.loadLecturesForParser(),
                this.loadLecturesForSettings(),
                this.loadDashboardStats()
            ]);
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    }

    clearUserData() {
        // Clear current selections and data
        this.timerState.currentLecture = null;
        this.timerState.currentRecord = null;
        this.timerState.slides = [];
        this.homeState.stats = {
            totalLectures: 0,
            totalRecords: 0,
            totalSlides: 0,
            totalTime: 0
        };
        
        // Clear UI elements
        const lectureSelect = document.getElementById('lectureSelect');
        if (lectureSelect) {
            lectureSelect.innerHTML = '<option value="">Choose a lecture...</option>';
        }
        
        const recordSelect = document.getElementById('recordSelect');
        if (recordSelect) {
            recordSelect.innerHTML = '<option value="new">새 기록 시작</option>';
        }
        
        // Update stats display
        this.updateStatsDisplay();
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        // Find user in stored users
        const user = this.userState.users.find(u => u.username === username);
        
        if (!user) {
            this.showToast('User not found', 'error');
            return;
        }

        // Simple password check (in real app, use proper hashing)
        if (user.password !== password) {
            this.showToast('Invalid password', 'error');
            return;
        }

        // Login successful
        this.userState.currentUser = { 
            username: user.username, 
            email: user.email,
            joinDate: user.joinDate 
        };
        this.userState.isLoggedIn = true;
        
        // Store login state
        localStorage.setItem('slide_scribe_current_user', JSON.stringify(this.userState.currentUser));
        
        this.updateUserInterface();
        this.closeModal();
        this.showToast(`Welcome back, ${user.username}!`, 'success');
        
        // Clear form
        document.getElementById('loginForm').reset();
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!username || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Check if username already exists
        const existingUser = this.userState.users.find(u => u.username === username);
        if (existingUser) {
            this.showToast('Username already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            username,
            password, // In real app, hash this
            email: `${username}@example.com`, // Simplified for demo
            joinDate: new Date().toISOString()
        };

        // Add to users array and save
        this.userState.users.push(newUser);
        this.saveStoredUsers(this.userState.users);

        // Auto-login the new user
        this.userState.currentUser = { 
            username: newUser.username, 
            email: newUser.email,
            joinDate: newUser.joinDate 
        };
        this.userState.isLoggedIn = true;
        
        localStorage.setItem('slide_scribe_current_user', JSON.stringify(this.userState.currentUser));
        
        this.updateUserInterface();
        this.closeModal();
        this.showToast(`Account created successfully! Welcome, ${username}!`, 'success');
        
        // Clear form
        document.getElementById('registerForm').reset();
    }

    logout() {
        this.userState.currentUser = null;
        this.userState.isLoggedIn = false;
        
        localStorage.removeItem('slide_scribe_current_user');
        
        this.updateUserInterface();
        this.showToast('Logged out successfully', 'info');
        
        // Optionally clear user-specific data or redirect to home
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
        
        // Also remove all records for this lecture
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SlideScribeApp();
    
    // Load saved dark mode preference
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
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