/**
 * Main Application orchestrator
 */
import { CanvasManager } from './canvas/CanvasManager.js';
import { TimelineManager } from './timeline/Timeline.js';
import { UIManager } from './ui/UIManager.js';
import { Exporter } from './export/Exporter.js';

class App {
    constructor() {
        this.canvasManager = null;
        this.timelineManager = null;
        this.uiManager = null;
        this.exporter = null;
    }

    init() {
        console.log("Initializing Jitter Clone MVP...");
        
        // Initialize Core Modules
        this.canvasManager = new CanvasManager('main-canvas');
        this.timelineManager = new TimelineManager(this.canvasManager);
        this.uiManager = new UIManager(this.canvasManager, this.timelineManager);
        this.exporter = new Exporter(this.canvasManager, this.timelineManager);
        
        // Setup Resize handling
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Setup Global Keyboard Shortcuts
        window.addEventListener('keydown', this.handleKeydown.bind(this));
        
        console.log("App ready!");
    }

    handleResize() {
        if (this.canvasManager) {
            this.canvasManager.resize();
        }
    }
    
    handleKeydown(e) {
        // Prevent shortcuts if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key.toLowerCase()) {
            case 'backspace':
            case 'delete':
                this.canvasManager.deleteSelected();
                break;
            case 'v':
                this.uiManager.selectTool('select');
                break;
            case 'r':
                this.uiManager.selectTool('rect');
                break;
            case 'o':
                this.uiManager.selectTool('circle');
                break;
            case 't':
                this.uiManager.selectTool('text');
                break;
            case ' ':
                e.preventDefault(); // Prevent page scroll
                this.timelineManager.togglePlay();
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.canvasManager.redo();
                    } else {
                        this.canvasManager.undo();
                    }
                }
                break;
        }
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
