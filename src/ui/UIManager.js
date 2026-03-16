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
            objs.forEach(obj => {
                this.canvasManager.canvas.centerObject(obj);
                obj.setCoords(); // Fix selection box
            });
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
        
        document.getElementById('btn-align-h')?.addEventListener('click', () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            objs.forEach(obj => {
                this.canvasManager.canvas.centerObjectH(obj);
                obj.setCoords();
            });
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
        
        document.getElementById('btn-align-v')?.addEventListener('click', () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            objs.forEach(obj => {
                this.canvasManager.canvas.centerObjectV(obj);
                obj.setCoords();
            });
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        });
        
        // Image Import
        document.getElementById('btn-image')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        img.set({
                            left: this.canvasManager.canvas.width / 2,
                            top: this.canvasManager.canvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            id: `obj-${this.canvasManager.objectCounter++}`,
                            name: `Image ${this.canvasManager.objectCounter}`
                        });
                        const maxDim = 300; // Resize if huge
                        if (img.width > maxDim || img.height > maxDim) {
                            const scale = Math.min(maxDim / img.width, maxDim / img.height);
                            img.scale(scale);
                        }
                        this.canvasManager.canvas.add(img);
                        this.canvasManager.canvas.setActiveObject(img);
                        this.canvasManager.dispatchCanvasChange();
                        this.selectTool('select');
                        this.canvasManager.saveHistory();
                    });
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
        
        // Shadow Toggle logic
        const shadowToggle = document.getElementById('prop-shadow-toggle');
        const shadowGroup = document.getElementById('group-shadow-settings');
        const shadowOpacity = document.getElementById('prop-shadow-opacity');
        const shadowBlur = document.getElementById('prop-shadow-blur');
        const shadowOffset = document.getElementById('prop-shadow-offset');
        const shadowAngle = document.getElementById('prop-shadow-angle');
        
        const updateShadow = () => {
            const objs = this.canvasManager.canvas.getActiveObjects();
            if (!objs.length) return;
            
            if (shadowToggle.checked) {
                shadowGroup.style.display = 'block';
                const opacity = parseFloat(shadowOpacity.value);
                const blur = parseInt(shadowBlur.value);
                const distance = parseInt(shadowOffset.value);
                const angle = parseInt(shadowAngle.value);
                
                // Trigonometry to convert angle and distance to X/Y offset
                const radians = angle * (Math.PI / 180);
                const offsetX = Math.round(distance * Math.cos(radians));
                const offsetY = Math.round(distance * Math.sin(radians));
                
                objs.forEach(obj => {
                    obj.set('shadow', new fabric.Shadow({
                        color: `rgba(0,0,0,${opacity})`,
                        blur: blur,
                        offsetX: offsetX,
                        offsetY: offsetY
                    }));
                });
            } else {
                shadowGroup.style.display = 'none';
                objs.forEach(obj => obj.set('shadow', null));
            }
            this.canvasManager.canvas.requestRenderAll();
            this.canvasManager.saveHistory();
        };

        if (shadowToggle) shadowToggle.addEventListener('change', updateShadow);
        if (shadowOpacity) shadowOpacity.addEventListener('input', updateShadow);
        if (shadowBlur) shadowBlur.addEventListener('input', updateShadow);
        if (shadowOffset) shadowOffset.addEventListener('input', updateShadow);
        if (shadowAngle) shadowAngle.addEventListener('input', updateShadow);
    }
    
    updatePropertiesPanel(activeObjects) {
        const content = document.getElementById('properties-content');
        const emptyState = this.propertyPanel.querySelector('.empty-state');
        const colorPicker = document.getElementById('prop-fill');
        const scaleSlider = document.getElementById('prop-scale');
        const fontGroup = document.getElementById('group-font');
        const fontSelect = document.getElementById('prop-font');
        const shadowToggle = document.getElementById('prop-shadow-toggle');
        const shadowGroup = document.getElementById('group-shadow-settings');
        const shadowOpacity = document.getElementById('prop-shadow-opacity');
        const shadowBlur = document.getElementById('prop-shadow-blur');
        const shadowOffset = document.getElementById('prop-shadow-offset');
        const shadowAngle = document.getElementById('prop-shadow-angle');
        
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
            
            // Sync Shadow Toggles
            if (shadowToggle && shadowGroup) {
                if (obj.shadow) {
                    shadowToggle.checked = true;
                    shadowGroup.style.display = 'block';
                    
                    // Extract opacity from rgba string or use default
                    let opacity = 0.5;
                    if (obj.shadow.color && obj.shadow.color.includes('rgba')) {
                        const match = obj.shadow.color.match(/[\d.]+\)$/);
                        if (match) opacity = parseFloat(match[0]);
                    }
                    
                    // Reverse trigonometry to find distance and angle from offsetX/Y
                    const ox = obj.shadow.offsetX || 0;
                    const oy = obj.shadow.offsetY || 0;
                    const distance = Math.round(Math.sqrt(ox*ox + oy*oy));
                    
                    let angle = Math.round(Math.atan2(oy, ox) * (180 / Math.PI));
                    if (angle < 0) angle += 360;
                    
                    if (shadowOpacity) shadowOpacity.value = opacity;
                    if (shadowBlur) shadowBlur.value = obj.shadow.blur || 10;
                    if (shadowOffset) shadowOffset.value = distance || 5;
                    if (shadowAngle) shadowAngle.value = angle || 45;
                } else {
                    shadowToggle.checked = false;
                    shadowGroup.style.display = 'none';
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
                    
                    // Force timeline update and rebuild deterministic GSAP timeline
                    this.timelineManager.renderTracks();
                    
                    // Reset global timeline to start from 0
                    if (this.timelineManager.masterTimeline) {
                        this.timelineManager.masterTimeline.time(0);
                    }
                    if (!this.timelineManager.isPlaying) {
                        this.timelineManager.togglePlay();
                    }
                }
            });
        });
    }

    applyAnimation(obj, type) {
        // Data-driven animation injection
        if (!obj.animations) obj.animations = [];
        
        // Build metadata config (Start 0, duration 1. Out animations start later)
        let config = { type: type, start: 0, duration: 1 };
        if (type.includes('-out')) config.start = this.timelineManager.duration - 1.5;
        
        obj.animations.push(config);
        
        // The TimelineManager now deterministically builds the actual GSAP commands.
        this.timelineManager.rebuildTimeline();
        this.canvasManager.saveHistory();
    }
}
