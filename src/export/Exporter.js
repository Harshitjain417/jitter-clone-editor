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
        this.exportBtn.addEventListener('click', () => {
             this.exportVideo();
        });
    }
    
    exportVideo() {
        // Simple WebM MediaRecorder export
        const canvas = document.getElementById('main-canvas');
        if (!canvas) return;
        
        // Ensure we are playing from the start to capture
        this.timelineManager.stopPlayback();
        if (window.gsap) gsap.globalTimeline.time(0);
        
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = function() {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `jitter-clone-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Export complete!');
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Play timeline
        this.timelineManager.startPlayback();
        
        // Stop recording after duration (e.g. 5 seconds)
        setTimeout(() => {
            mediaRecorder.stop();
            this.timelineManager.stopPlayback();
        }, this.timelineManager.duration * 1000);
        
        alert('Export started... Please wait 5 seconds.');
    }
}
