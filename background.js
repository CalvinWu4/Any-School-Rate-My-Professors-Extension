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
            origins: [tab.url + "*"]
        }, function(granted) { // The callback argument will be true if the user granted the permissions.
            if (granted) {
                // Refresh the page to inject the code
                var code = 'window.location.reload();';
                chrome.tabs.executeScript(tab.id, {code: code});          
            }
            else {
                if(chrome.runtime.lastError) console.error(chrome.runtime.lastError);
                throw Error("Permission denied for host ");
            }
    });
}

let savedRecords = JSON.parse(localStorage.getItem("records"));
let urls;
if (savedRecords) {
    urls = savedRecords.map(record => record.fields.URL);
}

// Sync saved data with airtable data
function getData() {
    fetch('https://airtable.calvinwu4.workers.dev/')
        .then(response => response.json())
        .then(data => { 
            records = data.records.filter(record => 
                record.fields.College &&
                record.fields.ID &&
                new URL(record.fields.URL)  && 
                record.fields.Selector);
            if (JSON.stringify(savedRecords) != JSON.stringify(records)) {
                savedRecords = records;
                localStorage.setItem("records", JSON.stringify(records));
                chrome.runtime.reload();
            }
        });
}

getData();

// Rules for when to show page action and icon
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
  
function injectCode(tabId) {
    chrome.tabs.insertCSS({
        file: "prof-rating.css"
    });
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
        file: "node_modules/compromise/builds/compromise.js"
    });
    chrome.tabs.executeScript({
        file: "names.js"
    });
    chrome.tabs.executeScript({
        file: "arrive.min.js"
    });
    chrome.tabs.executeScript({
        file: "tooltipster/dist/js/tooltipster.bundle.min.js"
    });
    chrome.tabs.executeScript({
        file: "contentscript.js"
    }, function() {
        chrome.tabs.sendMessage(tabId, {records: savedRecords}); // Send records to content script
    });
}

// Give host permission to allow for injection of code
chrome.pageAction.onClicked.addListener(function(tab) {
    requestHostPermission(tab)
});

// Inject code to page if host permission is granted
chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    injectCode(tabId);
    getData();
});