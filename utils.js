const parenthesesRegex = /\s*\(.*?\)\s*/g;

function isInitial(str) {
    str = str.toLowerCase().replace('.', '');
    return str.length === 1 && str.match(/[a-z]/i);
}

// Convert "last name, first name" to "first name last name"
function normalizeNameOrder(fullName) {
    let normalizedName = JSON.parse(JSON.stringify(fullName));

    if (fullName.includes(',')) {
        const commaSplitName = fullName.split(',');
        normalizedName = `${commaSplitName[1]} ${commaSplitName[0]}`;
        normalizedName = normalizedName.trim();
    }

    return normalizedName;
}

function loadCSS(filename, document) {
    var head = document.head;
    var link = document.createElement("link");
  
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = chrome.extension.getURL(filename);
  
    head.appendChild(link);
}

function unloadCSS(filename, document) {
    var targetelement="link"; 
    var targetattr="href";
    var allsuspects=document.getElementsByTagName(targetelement)

    for (var i=allsuspects.length; i>=0; i--) { //search backwards within nodelist for matching elements to remove
        if (allsuspects[i] && allsuspects[i].getAttribute(targetattr)!=null && 
        allsuspects[i].getAttribute(targetattr).indexOf(filename)!=-1) {
            allsuspects[i].parentNode.removeChild(allsuspects[i]) //remove element by calling parentNode.removeChild()
        }
    }
}

function commonSubsequence(array){
    let sortedArray = array.sort(); 
    let first = sortedArray[0];
    let last = sortedArray.pop();
    let length = first.length;
    let index = 0;
    
    while(index<length && first[index] === last[index])
        index++;
    return first.substring(0, index);
}