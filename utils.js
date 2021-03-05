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

// Return all possible non-null subset combos from an array
function combinations(array) {
    let combos = new Array(1 << array.length).fill().map(
      (e1, i) => array.filter((e2, j) => i & 1 << j));
    // Filter out null combo
    combos = combos.filter(a => a.length > 0);

    return combos;
  }

const surnameParticles = ['a', 'à', 'af', 'al', 'am', 'aus\'m', 'aus’m', 'av', 'aw', 'ben', 'da', 'dai', 'dal', 'de',
    'de\'', 'de’', 'dei', 'del', 'dela', 'della', 'den', 'der', 'des', 'di', 'do', 'dos', 'du', 'el', 'la', 'las', 
    'le', 'li', 'lo', 'los', 'mac', 'ó', 'of', 'op', 'san', 'st', 'st.', '\'t', '’t', 'te', 'ten', 'ter', 'thoe', 
    'tot', 'van', 'vanden', 'vander', 'vom', 'von', 'y', 'z', 'zu', 'zum', 'zur']

function getNameCombos(nameArray) {
    nameArray = combinations(nameArray);
    function isSubset(arr) {
        return arr.every(val => surnameParticles.includes(val.toLowerCase()));
    }
    
    // Filter out name combos that only contain surname particles unless they are the only combo
    return nameArray.length > 1 ? nameArray.filter(combo => !isSubset(combo)) : nameArray;
}