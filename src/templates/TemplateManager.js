/**
 * Manage Templates Modal and Lottie Templates
 */
export class TemplateManager {
    constructor(canvasManager, timelineManager) {
        this.canvasManager = canvasManager;
        this.timelineManager = timelineManager;

        // UI Elements
        this.btnOpen = document.getElementById('btn-templates');
        this.btnClose = document.getElementById('btn-close-templates');
        this.modal = document.getElementById('templates-modal');
        this.grid = document.getElementById('templates-grid');

        // Sample templates
        // We simulate a Lottie AE template. The path can be replaced by user's actual JSON file.
        this.templates = [
            {
                id: 'ai-calling',
                title: 'AI Calling Animation',
                type: 'lottie',
                url: '/src/assets/templates/ai_calling.json',
                thumbnailText: 'AI Calling'
            },
            {
                id: 'ae-sample-1',
                title: 'After Effects Logo Reveal',
                type: 'lottie',
                url: 'https://assets2.lottiefiles.com/packages/lf20_U1KDBH.json', // Dummy lottie url
                thumbnailText: 'AE Lottie'
            },
            {
                id: 'basic-shapes',
                title: 'Basic Shapes Demo',
                type: 'fabric',
                thumbnailText: 'Fabric UI'
            }
        ];

        this.init();
    }

    init() {
        if (!this.btnOpen || !this.modal) return;

        this.btnOpen.addEventListener('click', () => this.openModal());
        this.btnClose.addEventListener('click', () => this.closeModal());
        
        // Close on clicking outside modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        this.renderTemplates();
    }

    openModal() {
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    renderTemplates() {
        this.grid.innerHTML = '';

        this.templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `
                <div class="template-thumbnail">
                    <div style="color: white; font-size: 0.8rem; opacity: 0.5;">
                        ${template.thumbnailText}
                    </div>
                </div>
                <div class="template-info">
                    <h4 class="template-title">${template.title}</h4>
                    <span class="template-type">${template.type === 'lottie' ? 'AE Lottie' : 'Standard'}</span>
                </div>
            `;

            card.addEventListener('click', () => this.loadTemplate(template));
            this.grid.appendChild(card);
        });
    }

    loadTemplate(template) {
        this.closeModal();

        if (template.type === 'lottie') {
            this.canvasManager.addLottieAnimation(template.url);
        } else {
            // Demo standard canvas items
            this.canvasManager.addRect();
            this.canvasManager.addCircle();
        }
    }
}
