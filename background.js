chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", request.url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                sendResponse({ JSONresponse: JSON.parse(xhr.responseText) });
            }
        }
        xhr.send();

        return true;
    });



function requestHostPermission(url){
    chrome.permissions.request({
        permissions: ['activeTab'],
        origins: [url + "*"]
        }, function(granted) {
        // The callback argument will be true if the user granted the permissions.
        if (!granted) {
        if(chrome.runtime.lastError) console.error(chrome.runtime.lastError);
        throw Error("Permission denied for host ");
        }
    });
}

urls = ['https://tigercenter.rit.edu/tigerCenterApp/api/class-search', 'https://www.reddit.com/'];

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    if (info.status === 'complete') {
        urls.forEach(url => {
            if(new URL(url).hostname === new URL(tab.url).hostname && 
            new URL(url).pathname === new URL(tab.url).pathname) {
                chrome.tabs.insertCSS({
                    file: "tooltipster/dist/css/tooltipster.main.min.css"
                });
                chrome.tabs.insertCSS({
                    file: "tooltip.css"
                });
                chrome.tabs.executeScript({
                    file: "jquery-3.3.1.min.js"
                });
                chrome.tabs.executeScript({
                    file: "node_modules/papaparse/papaparse.min.js"
                });
                chrome.tabs.executeScript({
                    file: "names.js"
                });
                chrome.tabs.executeScript({
                    file: "addedNicknames.js"
                });
                chrome.tabs.executeScript({
                    file: "arrive.min.js"
                });
                chrome.tabs.executeScript({
                    file: "tooltipster/dist/js/tooltipster.bundle.min.js"
                });
                chrome.tabs.executeScript({
                    file: "contentscript.js"
                });
            }
        });
    }
});

chrome.browserAction.onClicked.addListener(function(tab) {
    urls.forEach(url => {
        if(new URL(url).hostname === new URL(tab.url).hostname && 
        new URL(url).pathname === new URL(tab.url).pathname) {
            chrome.tabs.executeScript({
                code: requestHostPermission(tab.url),
            });
        }
    });
});