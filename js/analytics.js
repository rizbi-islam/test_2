class PortfolioAnalytics {
    constructor() {
        this.viewsKey = 'portfolio_views';
        this.clicksKey = 'portfolio_clicks';
        this.gaEnabled = false;
        this.init();
    }

    init() {
        this.incrementViewCount();
        this.trackClicks();
        this.setupGA();
        this.displayViewCount();
    }

    incrementViewCount() {
        let views = this.getViews();
        views.total = (views.total || 0) + 1;
        views.lastVisit = new Date().toISOString();
        
        // Track unique visitors (simple method)
        if (!views.visitorId) {
            views.visitorId = this.generateVisitorId();
            views.uniqueVisitors = (views.uniqueVisitors || 0) + 1;
        }
        
        this.saveViews(views);
        
        // Send to GA if enabled
        if (this.gaEnabled && typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                visitor_id: views.visitorId
            });
        }
    }

    trackClicks() {
        // Track project clicks
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Project links
            if (target.closest('.project-card') || target.closest('.btn-qa')) {
                this.trackEvent('project_click', {
                    element: target.tagName,
                    text: target.textContent?.trim()
                });
            }
            
            // Email clicks
            if (target.matches('a[href^="mailto:"]') || target.closest('a[href^="mailto:"]')) {
                const emailLink = target.href ? target : target.closest('a[href^="mailto:"]');
                const email = emailLink.href.replace('mailto:', '');
                
                this.trackEvent('email_click', { email });
                
                // Store in local storage
                let clicks = JSON.parse(localStorage.getItem(this.clicksKey) || '[]');
                clicks.push({
                    type: 'email',
                    email: email,
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname
                });
                localStorage.setItem(this.clicksKey, JSON.stringify(clicks));
            }
            
            // Resume downloads
            if (target.matches('a[href$=".pdf"]') || target.textContent?.toLowerCase().includes('resume')) {
                this.trackEvent('resume_download');
            }
        });
    }

    setupGA() {
        // Check if GA is available (you need to add the GA script tag in HTML)
        if (typeof gtag !== 'undefined') {
            this.gaEnabled = true;
            console.log('Google Analytics initialized');
        }
        
        // Alternative: Simple analytics endpoint (if you set up a serverless function)
        this.setupSimpleAnalytics();
    }

    setupSimpleAnalytics() {
        // Send data to a simple endpoint (example using webhook.site)
        const webhookUrl = 'https://webhook.site/#'; // Replace with your webhook
        
        const views = this.getViews();
        const data = {
            event: 'page_view',
            url: window.location.href,
            referrer: document.referrer || 'direct',
            timestamp: new Date().toISOString(),
            views: views.total,
            uniqueVisitors: views.uniqueVisitors,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language
        };
        
        // Send beacon (doesn't wait for response)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(webhookUrl, JSON.stringify(data));
        } else {
            // Fallback to fetch
            fetch(webhookUrl, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            });
        }
    }

    trackEvent(eventName, data = {}) {
        const eventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        // Store locally
        let events = JSON.parse(localStorage.getItem('portfolio_events') || '[]');
        events.push(eventData);
        localStorage.setItem('portfolio_events', JSON.stringify(events.slice(-100))); // Keep last 100 events
        
        // Send to GA
        if (this.gaEnabled && typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
    }

    displayViewCount() {
        const views = this.getViews();
        const counterElement = document.getElementById('view-counter');
        
        if (counterElement) {
            // Format number (1k, 1.5k, etc.)
            const formatViews = (num) => {
                if (num >= 1000) {
                    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                }
                return num.toString();
            };
            
            counterElement.textContent = `👁️ ${formatViews(views.total)} views`;
            counterElement.title = `Unique visitors: ${views.uniqueVisitors || 1}`;
        }
    }

    getViews() {
        return JSON.parse(localStorage.getItem(this.viewsKey) || '{}');
    }

    saveViews(views) {
        localStorage.setItem(this.viewsKey, JSON.stringify(views));
    }

    generateVisitorId() {
        // Generate a simple visitor ID
        return 'visitor_' + Math.random().toString(36).substr(2, 9) + 
               '_' + Date.now().toString(36);
    }

    // Admin function to get all analytics data
    getAnalyticsData() {
        return {
            views: this.getViews(),
            clicks: JSON.parse(localStorage.getItem(this.clicksKey) || '[]'),
            events: JSON.parse(localStorage.getItem('portfolio_events') || '[]'),
            currentSession: {
                startTime: new Date(sessionStorage.getItem('session_start') || Date.now()).toISOString(),
                page: window.location.pathname
            }
        };
    }
}
// Initialize analytics
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioAnalytics = new PortfolioAnalytics();
    
    // Store session start
    if (!sessionStorage.getItem('session_start')) {
        sessionStorage.setItem('session_start', Date.now());
    }
});