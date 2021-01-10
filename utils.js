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

function loadCSS(file, document) {
    var head = document.head;
    var link = document.createElement("link");
  
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = chrome.extension.getURL(file + '.css');
  
    head.appendChild(link);
}

function unloadCSS(file, document) {
    var cssNode = document.getElementById(file);
    cssNode && cssNode.parentNode.removeChild(cssNode);
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