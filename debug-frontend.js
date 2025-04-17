// This script should be pasted in the browser console to debug API calls

// Clear any previous listeners
if (window._debugXHR) {
    window._debugXHR.restore();
    console.log('Reset previous debug hooks');
}

// Keep track of original method
const originalOpen = XMLHttpRequest.prototype.open;
const originalFetch = window.fetch;

// Track all XMLHttpRequest API calls
XMLHttpRequest.prototype.open = function(method, url) {
    if (url.includes('shop-pets') && url.includes('status=Available')) {
        console.error('---------------');
        console.error('FOUND URL WITH STATUS PARAMETER:', url);
        console.error('Stack trace:');
        console.error(new Error().stack);
        console.error('---------------');
    }
    return originalOpen.apply(this, arguments);
};

// Track all fetch API calls
window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('shop-pets') && url.includes('status=Available')) {
        console.error('---------------');
        console.error('FOUND FETCH WITH STATUS PARAMETER:', url);
        console.error('Stack trace:');
        console.error(new Error().stack);
        console.error('---------------');
    }
    return originalFetch.apply(this, arguments);
};

// Save reference to restore later
window._debugXHR = {
    restore: function() {
        XMLHttpRequest.prototype.open = originalOpen;
        window.fetch = originalFetch;
    }
};

console.log('Debug hooks installed for XMLHttpRequest and fetch');
console.log('Look for console.error messages about status=Available in requests');
console.log('To remove hooks, run: window._debugXHR.restore()'); 