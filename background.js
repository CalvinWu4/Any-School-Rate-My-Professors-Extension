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
                throw Error("Permission denied for host");
            }
    });
}

let savedRecords = JSON.parse(localStorage.getItem("records"));
let savedNicknames = JSON.parse(localStorage.getItem("nicknames"));
let savedUrls;
if (savedRecords) {
    savedUrls = savedRecords.map(record => record.fields.URL);
}

// Sync saved data with airtable data
async function getAirtableRecords(tabUrl) {
    await fetch('https://airtable.calvinwu4.workers.dev/')
        .then(response => response.json())
        .then(data => { 
            records = data.records.filter(record => 
                record.fields.College &&
                new URL(record.fields.URL)  && 
                record.fields.Selectors);
                savedRecords = records;
                localStorage.setItem("records", JSON.stringify(records));
                const urls = records.map(record => record.fields.URL);
                // Need to reload extension to change icon
                // Reload extension on install and if current url got added/removed from Airtable
                if (tabUrl === null || 
                    (urls.some(url => new URL(url).hostname.toLowerCase() === new URL(tabUrl).hostname.toLowerCase()) 
                    !== savedUrls.some(url => new URL(url).hostname.toLowerCase() === new URL(tabUrl).hostname.toLowerCase()))) {
                    savedUrls = urls;
                    chrome.runtime.reload();
                }
            });
}

// Conditions of which to light up icon
let conditions = [];

function getConditions(){
    conditions = [];
    savedUrls && savedUrls.forEach(url => {
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
    actions: [ new chrome.declarativeContent.SetIcon({path:'images/favicon-16.png'}) ]
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

// Save nicknames to localstorage
function getNicknames(){
    fetch('https://raw.githubusercontent.com/carltonnorthern/nickname-and-diminutive-names-lookup/master/names.csv')
    .then(response => response.text())
    .then(text => {
        text = text.trim();
        const parsed = Papa.parse(text).data
        var nicknames = {};
        for (var i = 0; i < parsed.length; i++)
        {
            nicknames[parsed[i][0]] = parsed[i].slice(1);
        }

        localStorage.setItem("nicknames", JSON.stringify(nicknames));
        localStorage.setItem("nicknames-retrieval-date", JSON.stringify(new Date()));
    })
}

chrome.runtime.onInstalled.addListener(function(details) {
    getNicknames();
    // Get data on first install
    if(details.reason == "install"){
        getAirtableRecords(null).then(function(){
            getConditions();
        });
    }
    // Refresh rules
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([showIconRule, showPageActionRule]);
    });
});
  
function injectCode(tabId) {
    chrome.tabs.removeCSS({
        file: "node_modules/tippy.js/dist/tippy.css"
    });
    chrome.tabs.insertCSS({
        file: "node_modules/tippy.js/dist/tippy.css"
    });
    chrome.tabs.removeCSS({
        file: "node_modules/tippy.js/themes/light.css"
    });
    chrome.tabs.insertCSS({
        file: "node_modules/tippy.js/themes/light.css"
    });
    chrome.tabs.removeCSS({
        file: "prof-rating.css"
    });
    chrome.tabs.insertCSS({
        file: "prof-rating.css"
    });
    chrome.tabs.executeScript({
        file: "node_modules/compromise/builds/compromise.min.js"
    });
    chrome.tabs.executeScript({
        file: "node_modules/arrive/minified/arrive.min.js"
    });
    chrome.tabs.executeScript({
        file: "node_modules/@popperjs/core/dist/umd/popper.min.js"
    });
    chrome.tabs.executeScript({
        file: "node_modules/tippy.js/dist/tippy-bundle.umd.min.js"
    });
    chrome.tabs.executeScript({
        file: "utils.js"
    });
    chrome.tabs.executeScript({
        file: "contentscript.js"
    }, function() {
        chrome.tabs.sendMessage(tabId, {records: savedRecords, nicknames: savedNicknames}); // Send records to content script
    });
}

chrome.pageAction.onClicked.addListener(function(tab) {
    // If URL is saved, prompt host permission to allow for injection of code
    getAirtableRecords(tab.url).then(function(){
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
            chrome.declarativeContent.onPageChanged.addRules([showIconRule, showPageActionRule]);
        });
    });
    if (savedUrls && savedUrls.some(url => new URL(url).hostname === new URL(tab.url).hostname)) {
        requestHostPermission(tab);
    }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.pageAction.show(activeInfo.tabId); // Always show pageaction
});

// Inject code to page if host permission is granted
chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    chrome.pageAction.show(tabId); // Always show pageaction

    const thirtydays = 2592000000; // ms in 30 days
    // Refresh saved nicknames every month
    if (!localStorage["nicknames-retrieval-date"] || 
    new Date().getTime() - new Date(JSON.parse(localStorage["nicknames-retrieval-date"])).getTime() >= thirtydays) {
        getNicknames();
    }

    chrome.permissions.contains({
        origins: [tab.url + "*"]
      }, function(result) {
        if (result) {
          // The extension has the permissions.
          injectCode(tabId);
        }
      });
});