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
        
        // Listeners for selection updates
        this.canvas.on('selection:created', this.handleSelectionChange.bind(this));
        this.canvas.on('selection:updated', this.handleSelectionChange.bind(this));
        this.canvas.on('selection:cleared', this.handleSelectionChange.bind(this));
        
        // Listeners for canvas clicking (tool handling)
        this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
        
        window.addEventListener('resize', this.resize.bind(this));
        this.resize(); // Initial resize to fit viewport
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
        
        // Apply CSS transform to scale the wrapper
        wrapper.style.transform = `scale(${scaleToFit})`;
        // The actual fabric canvas dimensions remain 800x450
    }
}
