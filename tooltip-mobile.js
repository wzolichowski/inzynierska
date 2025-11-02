// Mobile Tooltip Handler
document.addEventListener('DOMContentLoaded', () => {
    // Check if device is mobile/touch
    const isTouchDevice = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) || 
                          (navigator.msMaxTouchPoints > 0);
    
    if (isTouchDevice) {
        const featureItems = document.querySelectorAll('.feature-item');
        
        featureItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close all other tooltips
                featureItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // Toggle current tooltip
                item.classList.toggle('active');
            });
        });
        
        // Close tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.feature-item')) {
                featureItems.forEach(item => {
                    item.classList.remove('active');
                });
            }
        });
    }
});