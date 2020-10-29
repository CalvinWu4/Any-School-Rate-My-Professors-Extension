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

function requestHostPermission(tab){
    chrome.permissions.request({
        permissions: ['activeTab'],
        origins: [tab.url + "*"]
        }, function(granted) {
            var code = 'window.location.reload();';
            chrome.tabs.executeScript(tab.id, {code: code});          
            // The callback argument will be true if the user granted the permissions.
            if (!granted) {
                if(chrome.runtime.lastError) console.error(chrome.runtime.lastError);
                throw Error("Permission denied for host ");
            }
    });
}

urls = ['https://tigercenter.rit.edu/tigerCenterApp/api/class-search', 'https://www.reddit.com/'];
let conditions = [];
urls.forEach(url => 
    conditions.push(
        new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: new URL(url).hostname }
      })
))

const rule = {
    conditions: conditions,
    actions: [ new chrome.declarativeContent.ShowPageAction(), new chrome.declarativeContent.SetIcon({path:'images/icon16.png'}) ]
  };
  
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([rule]);
    });
});
  

function insertContentScript(){
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

chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    if (info.status === 'complete') {
        insertContentScript();
    }
});

chrome.pageAction.onClicked.addListener(function(tab) {
    requestHostPermission(tab)
});
