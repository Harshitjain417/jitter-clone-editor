/**
 * Manages the Fabric.js canvas instance and interactions
 */

export class CanvasManager {
    constructor(canvasId) {
        // Find the wrapper element to size the canvas correctly
        const wrapper = document.querySelector('.canvas-wrapper');
        const width = 800;
        const height = 450;
        
        // Initialize Fabric canvas
        // The global fabric variable is provided by the CDN script in index.html
        this.canvas = new fabric.Canvas(canvasId, {
            width: width,
            height: height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true, // Keep objects in order when selected
            selection: true, // Allow multi-selection
        });
        
        this.currentTool = 'select'; // Default tool
        this.objectCounter = 1;

        // Undo/Redo State
        this.history = [];
        this.historyIndex = -1;
        this.isHistoryProcessing = false;
        
        // Listeners for selection updates
        this.canvas.on('selection:created', this.handleSelectionChange.bind(this));
        this.canvas.on('selection:updated', this.handleSelectionChange.bind(this));
        this.canvas.on('selection:cleared', this.handleSelectionChange.bind(this));
        
        // Listeners for canvas clicking (tool handling)
        this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
        
        // Listeners for history changes
        this.canvas.on('object:added', () => this.saveHistory());
        this.canvas.on('object:modified', () => this.saveHistory());
        this.canvas.on('object:removed', () => this.saveHistory());
        
        // Canvas Zoom on scroll
        this.canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 0.1) zoom = 0.1;
            this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        window.addEventListener('resize', this.resize.bind(this));
        this.resize(); // Initial resize to fit viewport
        
        // Save initial blank state
        setTimeout(() => this.saveHistory(), 100);
    }
    
    setTool(tool) {
        this.currentTool = tool;
        if (tool === 'select') {
            this.canvas.defaultCursor = 'default';
            this.canvas.selection = true;
            this.canvas.forEachObject(o => o.selectable = true);
        } else {
            this.canvas.defaultCursor = 'crosshair';
            this.canvas.selection = false;
            this.canvas.forEachObject(o => o.selectable = false);
            this.canvas.discardActiveObject();
            this.canvas.requestRenderAll();
        }
    }
    
    handleMouseDown(options) {
        if (this.currentTool === 'select') return;
        
        const pointer = this.canvas.getPointer(options.e);
        let newObj = null;
        const baseOptions = {
            left: pointer.x,
            top: pointer.y,
            fill: '#6366f1',
            originX: 'center',
            originY: 'center',
            id: `obj-${this.objectCounter++}`,
            name: `${this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1)} ${this.objectCounter}`
        };
        
        switch (this.currentTool) {
            case 'rect':
                newObj = new fabric.Rect({
                    ...baseOptions,
                    width: 100,
                    height: 100,
                    rx: 8,
                    ry: 8
                });
                break;
            case 'circle':
                newObj = new fabric.Circle({
                    ...baseOptions,
                    radius: 50
                });
                break;
            case 'text':
                newObj = new fabric.IText('Text', {
                    ...baseOptions,
                    fontFamily: 'Inter',
                    fontSize: 40,
                    fontWeight: 700,
                    fill: '#1a1b23'
                });
                break;
        }
        
        if (newObj) {
            this.canvas.add(newObj);
            this.canvas.setActiveObject(newObj);
            
            // Switch back to select tool
            if (window.app && window.app.uiManager) {
                window.app.uiManager.selectTool('select');
            }
            
            // Dispatch event for UI updates
            this.dispatchCanvasChange();
        }
    }
    
    handleSelectionChange() {
        // Dispatch custom event to notify UI
        const event = new CustomEvent('canvas:selection', { 
            detail: { objects: this.canvas.getActiveObjects() }
        });
        document.dispatchEvent(event);
    }
    
    dispatchCanvasChange() {
        const event = new CustomEvent('canvas:update', { 
            detail: { objects: this.canvas.getObjects() }
        });
        document.dispatchEvent(event);
    }
    
    addRect() {
        const newObj = new fabric.Rect({
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            fill: '#6366f1',
            originX: 'center',
            originY: 'center',
            id: `obj-${this.objectCounter++}`,
            name: `Rect ${this.objectCounter}`,
            width: 100,
            height: 100,
            rx: 8,
            ry: 8
        });
        this.canvas.add(newObj);
        this.canvas.setActiveObject(newObj);
        this.dispatchCanvasChange();
    }

    addCircle() {
        const newObj = new fabric.Circle({
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            fill: '#ec4899',
            originX: 'center',
            originY: 'center',
            id: `obj-${this.objectCounter++}`,
            name: `Circle ${this.objectCounter}`,
            radius: 50
        });
        this.canvas.add(newObj);
        this.canvas.setActiveObject(newObj);
        this.dispatchCanvasChange();
    }

    addLottieAnimation(url) {
        // Create an offscreen container for Lottie's canvas renderer
        const container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '400px';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        document.body.appendChild(container);

        // Load the lottie animation
        const anim = lottie.loadAnimation({
            container: container,
            renderer: 'canvas', // Use canvas renderer to work with Fabric.js
            loop: true,
            autoplay: true,
            path: url
        });

        anim.addEventListener('DOMLoaded', () => {
            // Wait a small tick for the canvas to be created and sized
            setTimeout(() => {
                const lottieCanvas = container.querySelector('canvas');
                if (!lottieCanvas) return;

                // Create a fabric image holding the lottie canvas
                const fabricImg = new fabric.Image(lottieCanvas, {
                    left: this.canvas.width / 2,
                    top: this.canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    id: `obj-${this.objectCounter++}`,
                    name: 'Lottie Animation'
                });

                // Attach references for cleanup
                fabricImg.lottieAnim = anim;
                fabricImg.lottieContainer = container;

                this.canvas.add(fabricImg);
                this.canvas.setActiveObject(fabricImg);
                this.dispatchCanvasChange();

                // Continuously update the fabric image when Lottie renders a new frame
                const updateTicker = () => {
                    if (this.canvas.contains(fabricImg)) {
                        fabricImg.dirty = true;
                        this.canvas.requestRenderAll();
                    } else {
                        // Cleanup if the object was deleted from canvas
                        anim.destroy();
                        if (container.parentNode) {
                            container.parentNode.removeChild(container);
                        }
                        gsap.ticker.remove(updateTicker);
                    }
                };
                gsap.ticker.add(updateTicker);
            }, 50);
        });
    }
    
    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => {
                this.canvas.remove(obj);
            });
            this.canvas.discardActiveObject();
            this.dispatchCanvasChange();
        }
    }
    
    resize() {
        const container = document.querySelector('.canvas-container');
        const wrapper = document.querySelector('.canvas-wrapper');
        
        if (!container || !wrapper) return;
        
        // Calculate scale to fit canvas inside container with padding
        const containerWidth = container.clientWidth - 80;
        const containerHeight = container.clientHeight - 80;
        
        const canvasWidth = 800; // Original logic size
        const canvasHeight = 450;
        
        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        const scaleToFit = Math.min(scaleX, scaleY, 1.5);
        
        wrapper.style.transform = `scale(${scaleToFit})`;
        // The actual fabric canvas dimensions remain 800x450
    }

    saveHistory() {
        if (this.isHistoryProcessing) return;
        
        // Truncate redo history if we make a new action
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        const json = JSON.stringify(this.canvas.toJSON(['id', 'name', 'animations']));
        
        // Prevent duplicate consecutive states
        if (this.history.length > 0 && this.history[this.historyIndex] === json) return;
        
        this.history.push(json);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.isHistoryProcessing = true;
            this.historyIndex--;
            this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.canvas.renderAll();
                this.isHistoryProcessing = false;
                this.dispatchCanvasChange();
            });
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.isHistoryProcessing = true;
            this.historyIndex++;
            this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.canvas.renderAll();
                this.isHistoryProcessing = false;
                this.dispatchCanvasChange();
            });
        }
    }
}
