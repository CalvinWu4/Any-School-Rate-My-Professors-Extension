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
async function getData() {
    await fetch('https://airtable.calvinwu4.workers.dev/')
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
                // Refresh URLs
                urls = savedRecords.map(record => record.fields.URL);
                chrome.runtime.reload();
            }
        });
}

// Conditions of which to light up icon
let conditions = [];

function getConditions(){
    conditions = [];
    urls && urls.forEach(url => {
        conditions.push(
            new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostEquals: new URL(url).hostname }
            })
        )
    })
    return conditions;
}

const showIconRule = {
    conditions: getConditions(),
    actions: [ new chrome.declarativeContent.SetIcon({path:'images/icon16.png'}) ]
  };

// Always show page action
const showPageActionRule = {
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { schemes: ['http', 'https'] } // Match every URL
        })
    ],
    actions: [ new chrome.declarativeContent.ShowPageAction() ]
};

  
chrome.runtime.onInstalled.addListener(function(details) {
    // Get data on first install
    if(details.reason == "install"){
        getData().then(function(){
            getConditions();
        });
    }
    // Refresh rules
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([showIconRule, showPageActionRule]);
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

chrome.pageAction.onClicked.addListener(function(tab) {
    // If URL is saved, prompt host permission to allow for injection of code
    getData().then(function(){
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
            chrome.declarativeContent.onPageChanged.addRules([showIconRule, showPageActionRule]);
        });    
        if (urls && urls.some(url => new URL(url).hostname === new URL(tab.url).hostname)) {
            requestHostPermission(tab);
        }
    });
});

// Inject code to page if host permission is granted
chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    chrome.permissions.contains({
        origins: [tab.url + "*"]
      }, function(result) {
        if (result) {
          // The extension has the permissions.
          injectCode(tabId);
        }
      });
});