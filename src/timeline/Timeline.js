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
        
        if (window.gsap) {
            this.masterTimeline = gsap.timeline({ paused: true });
        }
        
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
        
        // Handle duration change
        const durationInput = document.getElementById('timeline-duration');
        if (durationInput) {
            durationInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 4) val = 4;
                if (val > 20) val = 20;
                e.target.value = val;
                this.duration = val;
                if (!this.isPlaying) this.updatePlayhead();
            });
        }
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
        if (!window.gsap || !this.masterTimeline) return;
        
        // If at the end, restart
        if (this.currentTime >= this.duration) {
            this.currentTime = 0;
            this.masterTimeline.time(0);
        }
        
        if (this.currentTime === 0) {
            this.masterTimeline.restart();
        } else {
            this.masterTimeline.play();
        }
        
        this.updatePlayhead();
    }
    
    stopPlayback() {
        if (window.gsap && this.masterTimeline) {
            this.masterTimeline.pause();
        }
    }
    
    updatePlayhead() {
        if (!this.isPlaying || !this.masterTimeline) return;
        
        this.currentTime = this.masterTimeline.time();
        
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
            
            // Render animation blocks
            if (obj.animations && obj.animations.length > 0) {
                 obj.animations.forEach((anim) => {
                     const block = document.createElement('div');
                     block.style.position = 'absolute';
                     
                     // Convert timeline coordinates
                     const leftPercent = (anim.start / this.duration) * 100;
                     const widthPercent = (anim.duration / this.duration) * 100;
                     
                     block.style.left = `${leftPercent}%`;
                     block.style.top = '6px';
                     block.style.height = '20px';
                     block.style.width = `${widthPercent}%`;
                     block.style.backgroundColor = 'var(--accent-glow)';
                     block.style.border = '1px solid var(--accent-primary)';
                     block.style.borderRadius = '4px';
                     block.title = `${anim.type}`;
                     block.style.display = 'flex';
                     block.style.alignItems = 'center';
                     block.style.paddingLeft = '4px';
                     block.style.color = 'white';
                     block.style.fontSize = '0.6rem';
                     block.style.textTransform = 'capitalize';
                     block.style.overflow = 'hidden';
                     block.style.whiteSpace = 'nowrap';
                     block.textContent = anim.type.replace('-', ' ');
                     
                     track.appendChild(block);
                 });
            }
            
            this.tracksContainer.appendChild(track);
        });
        
        this.rebuildTimeline();
    }
    
    rebuildTimeline() {
        if (!window.gsap || !this.masterTimeline) return;
        
        // Reset base properties from fabric to strip GSAP overrides
        this.masterTimeline.clear();
        
        const objects = this.canvasManager.canvas.getObjects();
        objects.forEach(obj => {
            if (!obj.animations || obj.animations.length === 0) return;
            
            // Queue animations onto master timeline positionally
            obj.animations.forEach(anim => {
                const duration = anim.duration || 1;
                let vars = { duration: duration, ease: "power2.out", onUpdate: () => this.canvasManager.canvas.requestRenderAll() };
                
                switch(anim.type) {
                    case 'fade-in':
                        this.masterTimeline.fromTo(obj, { opacity: 0 }, { opacity: 1, ...vars }, anim.start);
                        break;
                    case 'slide-in':
                        const originalY = obj.top || 0;
                        this.masterTimeline.fromTo(obj, { opacity: 0, top: originalY + 100 }, { opacity: 1, top: originalY, ...vars }, anim.start);
                        break;
                    case 'scale-in':
                        const origScaleX = obj.scaleX || 1;
                        const origScaleY = obj.scaleY || 1;
                        vars.ease = "back.out(1.7)";
                        this.masterTimeline.fromTo(obj, { scaleX: 0, scaleY: 0, opacity: 0 }, { scaleX: origScaleX, scaleY: origScaleY, opacity: 1, ...vars }, anim.start);
                        break;
                    case 'fade-out':
                        this.masterTimeline.fromTo(obj, { opacity: 1 }, { opacity: 0, ...vars }, anim.start);
                        break;
                    case 'slide-out':
                        const origYOut = obj.top || 0;
                        this.masterTimeline.fromTo(obj, { top: origYOut, opacity: 1 }, { top: origYOut + 100, opacity: 0, ...vars }, anim.start);
                        break;
                    case 'pulse':
                        const currentScale = obj.scaleX || 1;
                        vars.yoyo = true;
                        vars.repeat = 3;
                        vars.ease = "power1.inOut";
                        this.masterTimeline.fromTo(obj, { scaleX: currentScale, scaleY: currentScale }, { scaleX: currentScale * 1.2, scaleY: currentScale * 1.2, ...vars }, anim.start);
                        break;
                    case 'bounce':
                        const originalTop = obj.top || 0;
                        vars.ease = "bounce.out";
                        this.masterTimeline.fromTo(obj, { top: originalTop - 150 }, { top: originalTop, ...vars }, anim.start);
                        break;
                    case 'rotate':
                        const origAngle = obj.angle || 0;
                        this.masterTimeline.fromTo(obj, { angle: origAngle }, { angle: origAngle + 360, ...vars }, anim.start);
                        break;
                }
            });
        });
        
        // Scrub back to current time after rebuild
        this.masterTimeline.time(this.currentTime);
    }
}
