/**
 * Orchestrates UI interactions and links Canvas & Timeline
 */
export class UIManager {
    constructor(canvasManager, timelineManager) {
        this.canvasManager = canvasManager;
        this.timelineManager = timelineManager;
        
        // Cache DOM elements
        this.toolBtns = document.querySelectorAll('.tool-btn');
        this.layerList = document.getElementById('layer-list');
        this.propertyPanel = document.getElementById('property-panel');
        this.animEmptyState = document.getElementById('anim-empty-state');
        this.animControls = document.getElementById('anim-controls');
        
        this.setupToolbar();
        this.setupEventListeners();
        this.setupAnimationPresets();
    }
    
    setupToolbar() {
        this.toolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all
                this.toolBtns.forEach(b => b.classList.remove('active'));
                
                // Active on clicked
                const currentBtn = e.currentTarget;
                currentBtn.classList.add('active');
                
                // Determine tool name from id (e.g. btn-rect -> rect)
                // Use closest('.tool-btn') to ensure we get the button's ID even if the inner SVG is clicked
                const btnElement = e.target.closest('.tool-btn');
                if (btnElement) {
                    const toolName = btnElement.id.replace('btn-', '');
                    this.canvasManager.setTool(toolName);
                }
            });
        });
    }
    
    selectTool(toolName) {
        this.toolBtns.forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`btn-${toolName}`);
        if(btn) btn.classList.add('active');
        this.canvasManager.setTool(toolName);
    }
    
    setupEventListeners() {
        // Selection handling
        document.addEventListener('canvas:selection', (e) => {
            const objects = e.detail.objects;
            this.updatePropertiesPanel(objects);
            this.updateAnimationPanel(objects);
        });
        
        // Canvas modifications (layer update)
        document.addEventListener('canvas:update', (e) => {
            const objects = e.detail.objects;
            this.updateLayersPanel(objects);
        });
        
        // Properties manual input
        const colorPicker = document.getElementById('prop-fill');
        const scaleSlider = document.getElementById('prop-scale');
        const fontSelect = document.getElementById('prop-font');
        
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                const objs = this.canvasManager.canvas.getActiveObjects();
                if (objs.length) {
                    objs.forEach(obj => obj.set('fill', e.target.value));
                    this.canvasManager.canvas.requestRenderAll();
                }
            });
            // Finalize history state once dragging color is done
            colorPicker.addEventListener('change', () => this.canvasManager.saveHistory());
        }
        
        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                const objs = this.canvasManager.canvas.getActiveObjects();
                if (objs.length) {
                    const val = parseFloat(e.target.value);
                    objs.forEach(obj => {
                        obj.set('scaleX', val);
                        obj.set('scaleY', val);
                    });
                    this.canvasManager.canvas.requestRenderAll();
                }
            });
            scaleSlider.addEventListener('change', () => this.canvasManager.saveHistory());
        }
        
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                const objs = this.canvasManager.canvas.getActiveObjects();
                if (objs.length) {
                    objs.forEach(obj => {
                        if (obj.type === 'i-text' || obj.type === 'text') {
                            obj.set('fontFamily', e.target.value);
                        }
                    });
                    this.canvasManager.canvas.requestRenderAll();
                    this.canvasManager.saveHistory();
                }
            });
        }
        
        // Alignment Buttons
        document.getElementById('btn-align-c')?.addEventListener('click', () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            objs.forEach(obj => this.canvasManager.canvas.centerObject(obj));
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
        
        document.getElementById('btn-align-h')?.addEventListener('click', () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            objs.forEach(obj => this.canvasManager.canvas.centerObjectH(obj));
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
        
        document.getElementById('btn-align-v')?.addEventListener('click', () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            objs.forEach(obj => this.canvasManager.canvas.centerObjectV(obj));
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
    }
    
    updatePropertiesPanel(activeObjects) {
        const content = document.getElementById('properties-content');
        const emptyState = this.propertyPanel.querySelector('.empty-state');
        const colorPicker = document.getElementById('prop-fill');
        const scaleSlider = document.getElementById('prop-scale');
        const fontGroup = document.getElementById('group-font');
        const fontSelect = document.getElementById('prop-font');
        
        if (!activeObjects || activeObjects.length === 0) {
            emptyState.style.display = 'block';
            content.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            content.style.display = 'block';
            
            // Set input values based on first selected object
            const obj = activeObjects[0];
            if (obj.fill && typeof obj.fill === 'string' && colorPicker) {
                // Fabric returns rgb() or hex differently, robust conversion skipped for MVP
                if (obj.fill.startsWith('#')) {
                    colorPicker.value = obj.fill;
                }
            }
            if (scaleSlider && obj.scaleX) {
                scaleSlider.value = obj.scaleX;
            }
            
            // Show Font dropdown only if text is selected
            if (fontGroup) {
                if (obj.type === 'i-text' || obj.type === 'text') {
                    fontGroup.style.display = 'flex';
                    if (fontSelect && obj.fontFamily) {
                        fontSelect.value = obj.fontFamily;
                    }
                } else {
                    fontGroup.style.display = 'none';
                }
            }
        }
    }
    
    updateAnimationPanel(activeObjects) {
        if (!activeObjects || activeObjects.length === 0) {
            this.animEmptyState.style.display = 'block';
            this.animControls.style.display = 'none';
        } else {
            this.animEmptyState.style.display = 'none';
            this.animControls.style.display = 'block';
        }
    }
    
    updateLayersPanel(objects) {
        this.layerList.innerHTML = '';
        
        if (objects.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No objects on canvas';
            this.layerList.appendChild(empty);
            return;
        }
        
        // List from top to bottom
        [...objects].reverse().forEach((obj, index) => {
            const div = document.createElement('div');
            div.style.padding = '8px 12px';
            div.style.marginBottom = '4px';
            div.style.backgroundColor = 'var(--bg-dark)';
            div.style.borderRadius = '4px';
            div.style.fontSize = '0.8rem';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.cursor = 'pointer';
            
            // Highlight if selected
            if (obj === this.canvasManager.canvas.getActiveObject()) {
                div.style.borderLeft = '3px solid var(--accent-primary)';
                div.style.backgroundColor = 'var(--bg-hover)';
            }
            
            div.textContent = obj.name || `Layer ${objects.length - index}`;
            
            div.addEventListener('click', () => {
                this.canvasManager.canvas.setActiveObject(obj);
                this.canvasManager.canvas.requestRenderAll();
                // Manually fire the selection event to update properties
                this.canvasManager.handleSelectionChange(); 
            });
            
            this.layerList.appendChild(div);
        });
    }

    setupAnimationPresets() {
        const presetBtns = document.querySelectorAll('.preset-btn');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const animType = e.target.getAttribute('data-anim');
                const objects = this.canvasManager.canvas.getActiveObjects();
                
                if (objects.length && window.gsap) {
                    objects.forEach(obj => {
                        this.applyAnimation(obj, animType);
                    });
                    
                    // Force timeline update and autoplay to preview
                    this.timelineManager.renderTracks();
                    
                    // Reset global timeline to start from 0
                    gsap.globalTimeline.time(0);
                    if (!this.timelineManager.isPlaying) {
                        this.timelineManager.togglePlay();
                    }
                }
            });
        });
    }

    applyAnimation(obj, type) {
        // Simple GSAP setup interacting with FabricJS
        // Add animation metadata to object for the timeline to read 
        if (!obj.animations) obj.animations = [];
        obj.animations.push({ type: type, start: 0, duration: 1 });
        
        // GSAP to animate Fabric.js object properties
        // By using an onUpdate wrapper, GSAP can drive fabric objects.
        const duration = 1; // 1 second
        
        // Default target properties
        let vars = { duration: duration, ease: "power2.out", onUpdate: () => this.canvasManager.canvas.requestRenderAll() };
        
        // Reset properties before from-animations
        
        switch(type) {
            case 'fade-in':
                obj.set({ opacity: 0 });
                vars.opacity = 1;
                gsap.to(obj, vars);
                break;
            case 'slide-in':
                const originalY = obj.top;
                obj.set({ opacity: 0, top: originalY + 100 });
                vars.opacity = 1;
                vars.top = originalY;
                gsap.to(obj, vars);
                break;
            case 'scale-in':
                const origScaleX = obj.scaleX;
                const origScaleY = obj.scaleY;
                obj.set({ scaleX: 0, scaleY: 0, opacity: 0 });
                vars.scaleX = origScaleX;
                vars.scaleY = origScaleY;
                vars.opacity = 1;
                vars.ease = "back.out(1.7)";
                gsap.to(obj, vars);
                break;
            case 'fade-out':
                vars.opacity = 0;
                // Add a small delay for out animations
                vars.delay = 3;
                gsap.to(obj, vars);
                break;
            case 'slide-out':
                vars.top = obj.top + 100;
                vars.opacity = 0;
                vars.delay = 3;
                gsap.to(obj, vars);
                break;
            case 'pulse':
                const currentScale = obj.scaleX || 1;
                vars.scaleX = currentScale * 1.2;
                vars.scaleY = currentScale * 1.2;
                vars.yoyo = true;
                vars.repeat = 3;
                vars.ease = "power1.inOut";
                // Add a completion callback to reset
                vars.onComplete = () => {
                    obj.set({ scaleX: currentScale, scaleY: currentScale });
                    this.canvasManager.canvas.requestRenderAll();
                };
                gsap.to(obj, vars);
                break;
            case 'bounce':
                const originalTop = obj.top;
                obj.set({ top: originalTop - 150 });
                vars.top = originalTop;
                vars.ease = "bounce.out";
                gsap.to(obj, vars);
                break;
            case 'rotate':
                vars.angle = (obj.angle || 0) + 360;
                gsap.to(obj, vars);
                break;
        }
    }
}
