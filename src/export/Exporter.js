/**
 * Export functionality (Video generation)
 */
export class Exporter {
    constructor(canvasManager, timelineManager) {
        this.canvasManager = canvasManager;
        this.timelineManager = timelineManager;
        this.exportBtn = document.getElementById('btn-export');
        
        this.setupListeners();
    }
    
    setupListeners() {
        this.exportBtn.addEventListener('click', () => this.showModal());
        
        document.getElementById('btn-close-modal')?.addEventListener('click', () => this.hideModal());
        document.getElementById('btn-cancel-export')?.addEventListener('click', () => this.hideModal());
        
        document.getElementById('btn-start-export')?.addEventListener('click', () => {
             this.exportVideo();
        });
    }
    
    showModal() {
        const modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'flex';
        
        // Reset progress UI
        document.getElementById('export-progress-container').style.display = 'none';
        document.getElementById('export-progress-fill').style.width = '0%';
        document.getElementById('export-percentage').textContent = '0%';
    }
    
    hideModal() {
        const modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'none';
        
        if (this.exportInterval) {
            clearInterval(this.exportInterval);
        }
    }
    
    exportVideo() {
        const canvas = document.getElementById('main-canvas');
        if (!canvas) return;
        
        const formatSelect = document.getElementById('export-format');
        const format = formatSelect ? formatSelect.value : 'webm';
        let mimeType = 'video/webm';
        let extension = 'webm';
        
        if (format === 'mp4') {
            // Some browsers support pretending WebM is MP4 with specific codecs
            // For a browser-only MVP, we attempt mp4, fallback to webm
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            } else {
                mimeType = 'video/webm;codecs=vp9';
            }
            extension = 'mp4';
        }
        
        // UI Updates
        document.getElementById('export-progress-container').style.display = 'block';
        document.getElementById('btn-start-export').disabled = true;
        document.getElementById('btn-close-modal').disabled = true;
        
        // Ensure starting from 0
        this.timelineManager.stopPlayback();
        if (this.timelineManager.masterTimeline) {
            this.timelineManager.masterTimeline.time(0);
        }
        
        const stream = canvas.captureStream(60); // 60 FPS for smoothness
        const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        const chunks = [];
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `jitter-clone-${Date.now()}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            clearInterval(this.exportInterval);
            document.getElementById('btn-start-export').disabled = false;
            document.getElementById('btn-close-modal').disabled = false;
            this.hideModal();
        };
        
        // Start recording
        mediaRecorder.start();
        this.timelineManager.startPlayback();
        
        // Track progress
        const totalDuration = this.timelineManager.duration;
        const startTime = Date.now();
        
        this.exportInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            let percent = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
            
            document.getElementById('export-progress-fill').style.width = `${percent}%`;
            document.getElementById('export-percentage').textContent = `${percent}%`;
            
            if (elapsed >= totalDuration) {
                clearInterval(this.exportInterval);
                mediaRecorder.stop();
                this.timelineManager.stopPlayback();
            }
        }, 100);
    }
}
