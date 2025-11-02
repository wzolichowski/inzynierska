// Mobile Tooltip Handler
document.addEventListener('DOMContentLoaded', () => {
    console.log('tooltip-mobile.js loaded');
    
    // Check if device is mobile/touch
    const isTouchDevice = ('ontouchstart' in window) || 
                          (navigator.maxTouchPoints > 0) || 
                          (navigator.msMaxTouchPoints > 0);
    
    console.log('Is touch device:', isTouchDevice);
    
    if (isTouchDevice) {
        const featureItems = document.querySelectorAll('.feature-item');
        console.log('Found feature items:', featureItems.length);
        
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
                console.log('Tooltip toggled for:', item.querySelector('.feature-text').textContent);
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