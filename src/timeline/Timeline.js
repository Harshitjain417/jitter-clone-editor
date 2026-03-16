/**
 * Manages the Timeline UI and interactions
 */
export class TimelineManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.playBtn = document.getElementById('btn-play');
        this.timeDisplay = document.querySelector('.time-display');
        this.tracksContainer = document.getElementById('timeline-tracks');
        
        this.isPlaying = false;
        this.currentTime = 0; // in seconds
        this.duration = 5; // Total duration in seconds
        
        // This is a placeholder for the timeline logic
        this.setupListeners();
        this.renderTracks();
    }
    
    setupListeners() {
        this.playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // Listen to canvas updates to refresh layers on timeline
        document.addEventListener('canvas:update', (e) => {
            this.renderTracks();
        });
    }
    
    togglePlay() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            this.startPlayback();
        } else {
            this.playBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            this.stopPlayback();
        }
    }
    
    startPlayback() {
        // If at the end, restart
        if (this.currentTime >= this.duration) {
            this.currentTime = 0;
            if (window.gsap) gsap.globalTimeline.time(0);
        }
        if (window.gsap) gsap.globalTimeline.play();
        this.updatePlayhead();
    }
    
    stopPlayback() {
        if (window.gsap) gsap.globalTimeline.pause();
    }
    
    updatePlayhead() {
        if (!this.isPlaying) return;
        
        if (window.gsap) {
            this.currentTime = gsap.globalTimeline.time();
        }
        
        // Update display
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        const ms = Math.floor((this.currentTime % 1) * 100);
        this.timeDisplay.textContent = `00:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
        
        // Animate playhead CSS position (assuming 1 second = 100px)
        const playhead = document.getElementById('playhead');
        if (playhead) {
            playhead.style.left = `${Math.min(100, (this.currentTime / this.duration) * 100)}%`;
        }
        
        // Needs to call render on canvas if animating
        if (this.canvasManager && this.canvasManager.canvas) {
            this.canvasManager.canvas.requestRenderAll();
        }
        
        // Continue loop if playing and not at end
        if (this.currentTime < this.duration) {
            requestAnimationFrame(this.updatePlayhead.bind(this));
        } else {
            this.isPlaying = false;
            this.togglePlay();
            this.currentTime = 0; // reset
        }
    }
    
    renderTracks() {
        if (!this.tracksContainer) return;
        
        // Keep the playhead element
        const playhead = document.getElementById('playhead');
        this.tracksContainer.innerHTML = '';
        if (playhead) this.tracksContainer.appendChild(playhead);
        
        const objects = this.canvasManager.canvas.getObjects();
        
        if (objects.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'Add objects to see them on timeline';
            this.tracksContainer.appendChild(empty);
            return;
        }
        
        // Create a track for each object (reverse order so top layer is first)
        [...objects].reverse().forEach(obj => {
            const track = document.createElement('div');
            track.style.height = '32px';
            track.style.borderBottom = '1px solid var(--border-light)';
            track.style.display = 'flex';
            track.style.alignItems = 'center';
            track.style.paddingLeft = '16px';
            track.style.fontSize = '0.75rem';
            track.style.position = 'relative';
            track.textContent = obj.name || 'Object';
            
            // An animation block could go here visually
            const block = document.createElement('div');
            block.style.position = 'absolute';
            block.style.left = '20%';
            block.style.top = '6px';
            block.style.height = '20px';
            block.style.width = '30%';
            block.style.backgroundColor = 'var(--accent-glow)';
            block.style.border = '1px solid var(--accent-primary)';
            block.style.borderRadius = '4px';
            
            // Only add block if the object has animations attached (via custom properties)
            if (obj.animations && obj.animations.length > 0) {
                 track.appendChild(block);
            }
            
            this.tracksContainer.appendChild(track);
        });
    }
}
