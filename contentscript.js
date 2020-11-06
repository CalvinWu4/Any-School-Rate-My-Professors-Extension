let savedRecords = JSON.parse(localStorage.getItem("records"));

let waitForFetch;

// Add ratings if there are already records saved
if (savedRecords && savedRecords.length > 0) {
    AddRatings();
}
// Wait for records to be fetched before adding ratings
else{
    waitForFetch = true;
}

// Refresh records from background fetch
chrome.runtime.onMessage.addListener(function(message) {
    const records = message.records;
    savedRecords = records.filter(record => 
        new URL(record.fields.URL).hostname === window.location.hostname);
    localStorage.setItem("records", JSON.stringify(savedRecords));
    savedRecords = JSON.parse(localStorage.getItem("records"));
    if (waitForFetch) {
        waitForFetch = false;
        AddRatings();
    }
});

// Add professor ratings
function AddRatings() {
    const urlBase = "https://search-production.ratemyprofessors.com/solr/rmp/select/?solrformat=true&rows=2&wt=json&q=";
    const psMobileSelector = '#search-results .section-content .section-body'; // Handle PeopleSoft Mobile
    // Split CSS selectors by new line
    const selectors = savedRecords[0].fields.Selector.split(/\r?\n/)
        .filter(selector => selector != "")
        .map(function(selector) {
            selector = selector.trim();
            if (selector.toLowerCase() === 'peoplesoft mobile') {
                selector = psMobileSelector;
            }
            return selector;
        });
    // For professor names that are loaded when the page is loaded
    [...document.querySelectorAll(selectors)]
    .forEach(element => {
        let fullName = element.textContent;
        fullName = nlp(fullName).normalize({
            whitespace: true, 
            case: true, 
            punctuation: false, 
            unicode: true,
            contractions: false,
            acronyms: false, 
            parentheses: false, 
            possessives: true, 
            plurals: false,
            verbs: false,  
            honorifics: true}).out();
        let splitName = fullName.split(' ');
        const parsedFullName = nlp(fullName).people().out();
        const parsedSplitName = parsedFullName.split(' ');
        if (parsedSplitName.length > 1) {
            fullName = parsedFullName;
            splitName = parsedSplitName;
        }
        const firstName = splitName[0].toLowerCase().trim();
        const lastName = splitName.slice(-1)[0].toLowerCase().trim();
        let middleName;
        if (splitName.length > 2) {
            middleName = splitName[0];
            middleName = middleName.toLowerCase().trim();
        }
        const url = `${urlBase}${firstName}+${lastName}+AND+schoolid_s%3A${savedRecords[0].fields.ID}`
        const runAgain = true;
        // Query Rate My Professor with the professor's name
        GetProfessorRating(url, element, lastName, firstName, middleName, runAgain, firstName, 0, urlBase);
    });
    selectors.forEach(selector => {
    // For professor names that take time to load
        document.arrive(selector, function(){
            if (selector !== psMobileSelector || (selector === psMobileSelector && this.textContent.includes('Instructor: '))) {
                let fullName = this.textContent;
                fullName = nlp(fullName).normalize({
                    whitespace: true, 
                    case: true, 
                    punctuation: false, 
                    unicode: true,
                    contractions: false,
                    acronyms: false, 
                    parentheses: false, 
                    possessives: true, 
                    plurals: false,
                    verbs: false,  
                    honorifics: true}).out();
                let splitName = fullName.split(' ');
                const parsedFullName = nlp(fullName).people().out();
                const parsedSplitName = parsedFullName.split(' ');
                if (parsedSplitName.length > 1) {
                    fullName = parsedFullName;
                    splitName = parsedSplitName;
                }
                const firstName = splitName[0].toLowerCase().trim();
                const lastName = splitName.slice(-1)[0].toLowerCase().trim();
                let middleName;
                if (splitName.length > 2) {
                    middleName = splitName[0];
                    middleName = middleName.toLowerCase().trim();
                }
                url = `${urlBase}${firstName}+${lastName}+AND+schoolid_s%3A${savedRecords[0].fields.ID}`
                const runAgain = true;
                // Query Rate My Professor with the professor's name
                GetProfessorRating(url, this, lastName, firstName, middleName, runAgain, firstName, 0, urlBase);
            }
        })
    })
}

const nicknames = getNicknames();

function GetProfessorRating(url, element, lastName, firstName, middleName, runAgain, originalFirstName, index, urlBase) {
    chrome.runtime.sendMessage({ url: url }, function (response) {
        const resp = response.JSONresponse;
        const numFound = resp.response.numFound;
        const doc = resp.response.docs[0];

        // Append new anchor element
        const newElem = document.createElement('a');
        newElem.classList.add('prof-rating');
        newElem.textContent = element.textContent;
        element.textContent = '';
        newElem.setAttribute('target', '_blank');
        element.appendChild(newElem);
        
        // Add professor data if found
        if (numFound > 0 && doc) {
            const profID = doc.pk_id;
            const realFirstName = doc.teacherfirstname_t;
            const realLastName = doc.teacherlastname_t;
            const dept = doc.teacherdepartment_s;
            const profRating = doc.averageratingscore_rf && doc.averageratingscore_rf.toFixed(1);
            const numRatings = doc.total_number_of_ratings_i;
            const easyRating = doc.averageeasyscore_rf && doc.averageeasyscore_rf.toFixed(1);

            const profURL = "http://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + profID;
            newElem.textContent += ` (${profRating ? profRating : 'N/A'})`;
            newElem.setAttribute('href', profURL);

            let allprofRatingsURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + profID + "&page=0&max=20";
            AddTooltip(newElem, allprofRatingsURL, realFirstName, realLastName, profRating, numRatings, easyRating, dept);
        } else {
            // Try again with professor's middle name if it didn't work the first time
            if (middleName && runAgain) {
                firstName = middleName;
                url = urlBase + firstName + "+" + lastName + "+AND+schoolid_s%3A807";
                GetProfessorRating(url, newElem, lastName, firstName, middleName, false, null, urlBase);
            }
            // Try again with nicknames for the professor's first name
            else if (runAgain && nicknames[originalFirstName]) {
                url = urlBase + nicknames[originalFirstName][index] + "+" + lastName + "+AND+schoolid_s%3A807";
                GetProfessorRating(url, newElem, lastName, nicknames[originalFirstName][index], middleName, nicknames[originalFirstName][index+1], originalFirstName, index+1, urlBase);
            }
            // Set link to search results if not found
            else {
                newElem.textContent += " (NF)";
                newElem.setAttribute('href', 
                `https://www.ratemyprofessors.com/search.jsp?query=${originalFirstName}+${middleName ? middleName + '+': ''}${lastName}`);
            }
        }        
    });
}

function AddTooltip(element, allprofRatingsURL, realFirstName, realLastName, profRating, numRatings, easyRating, dept) {
    let ratings = [];
    function getRatings(url){
        chrome.runtime.sendMessage({ url: url }, function (response) { 
            ratings = ratings.concat(response.JSONresponse.ratings);
            var remaining = response.JSONresponse.remaining;
            let pageNum = parseInt(new URLSearchParams(url).get('page'));
            if(remaining !== 0) { 
                // Get all ratings by going through all the pages
                getRatings(url.replace(`page=${pageNum}`, `page=${pageNum + 1}`));
            }
            else{
                // Build content for professor tooltip
                let wouldTakeAgain = 0;
                let wouldTakeAgainNACount = 0;
                let mostHelpfulReview;
                let helpCount;
                let notHelpCount;
                let wouldTakeAgainText;
                let easyRatingText;
                let topTagsLabel;
                let topTagsFirstLineText;

                const div = document.createElement("div");
                const title = document.createElement("h3");
                title.textContent = "Rate My Professor Details";
                div.appendChild(title);
                const professorText = document.createElement("p");
                professorText.textContent = `${realFirstName} ${realLastName}, Professor in ${dept}`;
                div.appendChild(professorText);
                const avgRatingText = document.createElement("p");
                avgRatingText.textContent = `Overall Quality: ${profRating ? profRating : 'N/A'}/5`
                div.appendChild(avgRatingText);
                const numRatingsText = document.createElement("p");
                numRatingsText.textContent = `Number of Ratings: ${numRatings}`
                div.appendChild(numRatingsText);

                if (ratings.length > 0) {
                    let tagFreqMap = new Map();
                    for (let i = 0; i < ratings.length; i++) {
                        let rating = ratings[i];
                        if (rating.rWouldTakeAgain === "Yes") {
                            wouldTakeAgain++;
                        } else if (rating.rWouldTakeAgain === "N/A") {
                            wouldTakeAgainNACount++;
                        }

                        let teacherRatingTags = rating.teacherRatingTags;
                        for (let j = 0; j < teacherRatingTags.length; j++) {
                            let tag = teacherRatingTags[j];
                            if (tagFreqMap.get(tag)){
                                tagFreqMap.get(tag).count++;
                            }
                            else{
                                tagFreqMap.set(tag, { count: 0 });
                            }
                        }
                    }

                    ratings.sort(function(a,b) { return new Date(b.rDate) - new Date(a.rDate) });
                    ratings.sort(function(a,b) { return (b.helpCount - b.notHelpCount) - (a.helpCount - a.notHelpCount) });
                    mostHelpfulReview = ratings[0];
                    helpCount = mostHelpfulReview.helpCount;
                    notHelpCount = mostHelpfulReview.notHelpCount;

                    const topTags = ([...tagFreqMap.entries()].sort((a, b) => a.count - b.count)).splice(0, 5);
                    easyRatingText = document.createElement("p");
                    easyRatingText.textContent = `Level of Difficulty: ${easyRating}`;
                    div.appendChild(easyRatingText);
                    if (ratings.length >= 8 && wouldTakeAgainNACount < (ratings.length / 2)) {
                        wouldTakeAgain = ((wouldTakeAgain / (ratings.length - wouldTakeAgainNACount)) * 100).toFixed(0).toString() + "%";
                        wouldTakeAgainText = document.createElement("p");
                        wouldTakeAgainText.textContent = "Would take again: " + wouldTakeAgain;
                        div.appendChild(wouldTakeAgainText);
                    }
                    if (topTags.length > 0) {
                        topTagsLabel = document.createElement("p");
                        topTagsLabel.textContent = "Top Tags:";
                        div.appendChild(topTagsLabel);
                        topTagsFirstLineText = document.createElement("p");
                        topTagsSecondLineText = document.createElement("p");
                        for (let i = 0; i < topTags.length; i++) {
                            let tag = topTags[i][0];
                            if (i < 3) {
                                topTagsFirstLineText.textContent += `${tag}${i !== topTags.length - 1 ? ", " : ""}`;
                            }
                            else{
                                topTagsSecondLineText.textContent += `${tag}${i !== topTags.length - 1 ? ", " : ""}`;
                            }
                        }
                        div.appendChild(topTagsFirstLineText);
                        if (topTagsSecondLineText.childNodes) {
                            div.appendChild(topTagsSecondLineText);
                        }
                    }
                    div.appendChild(document.createElement("br"));
                }
                if (mostHelpfulReview) {
                    const classText = document.createElement("p");
                    classText.textContent = "Most Helpful Rating: " + mostHelpfulReview.rClass + 
                    (mostHelpfulReview.onlineClass === "online" ? " (Online)" : "");  // Mark if class was online
                    div.appendChild(classText);
                    const dateText = document.createElement("p");
                    dateText.textContent = mostHelpfulReview.rDate;
                    div.appendChild(dateText);
                    const profRating = document.createElement("p");
                    profRating.textContent = "Overall Quality: " + mostHelpfulReview.rOverallString;
                    div.appendChild(profRating);
                    const thisEasyRating = document.createElement("p");
                    thisEasyRating.textContent = "Level of Difficulty: " + mostHelpfulReview.rEasyString;
                    div.appendChild(thisEasyRating);
                    if (mostHelpfulReview.rWouldTakeAgain !== "N/A") {
                        const thisWouldTakeAgain = document.createElement("p");
                        thisWouldTakeAgain.textContent = "Would take again: " + mostHelpfulReview.rWouldTakeAgain;
                        div.appendChild(thisWouldTakeAgain);
                    }
                    const commentText = document.createElement("p");
                    commentText.textContent = mostHelpfulReview.rComments;
                    commentText.classList.add('paragraph');
                    div.appendChild(commentText);
                    const tagsText = document.createElement("p");
                    tagsText.textContent = "Tags: "
                    const tags = mostHelpfulReview.teacherRatingTags;
                    if (tags.length > 0) {
                        for (let i = 0; i < tags.length; i++) {
                            let tag = tags[i];
                            tagsText.textContent += `${tag}${i !== tags.length - 1 ? ", " : ""}`;
                        }
                        div.appendChild(tagsText);
                    }
                    const upvotesText = document.createElement("p");
                    upvotesText.textContent = `👍${helpCount} 👎${notHelpCount}`;
                    div.appendChild(upvotesText);
                }
                element.class = "tooltip";
                element.addEventListener("mouseenter", function () {
                    // Only create tooltip once
                    if (!$(element).hasClass('tooltipstered')) {
                        $(this)
                            .tooltipster({
                                animation: 'grow',
                                theme: 'tooltipster-default',
                                side: 'left',
                                content: div,
                                contentAsHTML: true,
                                delay: 100
                            })
                            .tooltipster('show');
                    }
                });
            }
        });
    }
    getRatings(allprofRatingsURL)
}