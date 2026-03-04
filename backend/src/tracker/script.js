(function () {
    'use strict';

    // Configuration
    var script = document.currentScript;
    var websiteId = script.getAttribute('data-website-id');
    var hostUrl =
        script.getAttribute('data-host-url') ||
        script.src.split('/').slice(0, -1).join('/');
    var endpoint = hostUrl + '/v1/p';

    if (!websiteId) {
        console.warn('Setup failed. Missing data-website-id attribute.');
        return;
    }

    // State
    var previousUrl = window.location.href;

    // Helper: Send data
    function track(eventName, eventData) {
        var payload = {
            website_id: websiteId,
            url: window.location.href,
            referrer: document.referrer || null,
            event_type: 'pageview',
            event_name: eventName || null,
            event_data: eventData || null,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            language: navigator.language,
        };

        // Use sendBeacon if available for better reliability on unload, otherwise fetch with keepalive
        if (navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(payload)], {
                type: 'application/json',
            });
            navigator.sendBeacon(endpoint, blob);
        } else if (window.fetch) {
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(function (e) {
                console.error('Failed to send data', e);
            });
        }
    }

    // Event: Page Load
    if (document.readyState === 'complete') {
        track();
    } else {
        window.addEventListener('load', function () {
            track();
        });
    }

    // Event: History API (SPA Support)
    var originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        track();
    };

    var originalReplaceState = history.replaceState;
    history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        track();
    };

    window.addEventListener('popstate', function () {
        track();
    });
})();
