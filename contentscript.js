let savedRecords = JSON.parse(localStorage.getItem("records"));
let savedNicknames = JSON.parse(localStorage.getItem("nicknames"));

let waitForFetch;

// Add ratings if there are already records saved
if (savedRecords && savedRecords.length > 0) {
    AddRatingsOnArrive();
}
// Wait for records to be fetched before adding ratings
else{
    waitForFetch = true;
}

// Refresh nicknames and Airtable records from background fetch
chrome.runtime.onMessage.addListener(function(message) {
    const fetchedNicknames = message.nicknames;
    // Only include records relevant to this URL
    const fetchedRecords = message.records.filter(record => 
        new URL(record.fields.URL).hostname === window.location.hostname);
        
    localStorage.setItem("records", JSON.stringify(fetchedRecords));
    localStorage.setItem("nicknames", JSON.stringify(fetchedNicknames));
    
    savedRecords = JSON.parse(localStorage.getItem("records"));
    savedNicknames = JSON.parse(localStorage.getItem("nicknames"));
    if (waitForFetch) {
        waitForFetch = false;
        AddRatingsOnArrive();
    }
});

// Add professor ratings
function AddRatingsOnArrive() {
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
    // Only add link to the appended rating
    const linkifyRating = savedRecords[0].fields["Only Add Link To Rating"];

    const AddRatings = function(element) {
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
        if (fullName && fullName !== 'staff' && fullName !== 'tba') {
            // Convert "last name, first name" to "first name last name"
            fullName = normalizeNameOrder(fullName);
            const splitName = fullName.split(' ');
            const firstName = splitName[0];
            const lastName = splitName.slice(-1)[0];
            let middleNames = [];
            let originalMiddleNames = [];
            if (splitName.length > 2) {
                middleNames = [...splitName.slice(1, splitName.length-1)];
                originalMiddleNames = [...middleNames];
            }
            // Try with no middle names at first
            const middleNamesString = '';
            const runAgain = true;
            const originalFirstName = firstName;
            const originalLastName = lastName;
            const index = 0;
            const middleNamesRemovalStep = 0; // Track which middle name removal strategy we are on
            const middleNameAsFirst = false;
            let firstInitial;
            if (isInitial(firstName)) {
                firstInitial = firstName;
            }
            // Query Rate My Professor with the professor's name
            GetProfessorRating(element, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, runAgain, 
                index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
        }
    };
    
    // For professor names that are loaded when the page is loaded
    [...document.querySelectorAll(selectors.join())]
        .forEach(element => AddRatings(element));
    selectors.forEach(selector => {
    // For professor names that take time to load
        document.arrive(selector, function(){
            AddRatings(this);
        });
    });
}

function GetProfessorRating(element, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
    runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating = false) {
    url = `${urlBase}${firstName ? firstName + '+' : ''}${(middleNamesString === '' ? '' : middleNamesString + "+")}${lastName}+AND+schoolid_s%3A${savedRecords[0].fields.ID}`;
    chrome.runtime.sendMessage({ url: url }, function (response) {
        const json = response.JSONresponse;
        const numFound = json.response.numFound;
        const docs = json.response.docs;
        let doc;
        if (numFound > 0) {
            if (!firstInitial) {
                doc = docs[0];
            }
            // Get the doc with a first name that matches the first initial
            else {
                docs.forEach(x => {
                    if (!doc && originalFirstName.charAt(0) === x.teacherfirstname_t.toLowerCase().charAt(0)) {
                        doc = x;
                    }
                });
            }
        }
        
        const newElem = document.createElement('a');
        // Append new anchor element
        newElem.classList.add('prof-rating');
        if (!linkifyRating) {
            newElem.textContent = element.textContent + ' ';
            element.textContent = '';
        }
        else {
            element.textContent += ' ';
        }
        newElem.setAttribute('target', '_blank');
        newElem.addEventListener('click', function (e) {
			e.stopPropagation();
		});
        element.appendChild(newElem);
        
        // Add professor data if found
        if (doc) {
            const profID = doc.pk_id;
            const realFullName = doc.teacherfullname_s;
            const realFirstName = doc.teacherfirstname_t;
            const dept = doc.teacherdepartment_s;
            const profRating = doc.averageratingscore_rf && doc.averageratingscore_rf.toFixed(1);
            const numRatings = doc.total_number_of_ratings_i;
            const easyRating = doc.averageeasyscore_rf && doc.averageeasyscore_rf.toFixed(1);
            const profURL = "http://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + profID;
            const allprofRatingsURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + profID + "&page=0&max=20";

            newElem.textContent += `(${profRating ? profRating : 'N/A'})`;
            newElem.setAttribute('href', profURL);
            AddTooltip(newElem, allprofRatingsURL, realFullName, profRating, numRatings, easyRating, dept);
        } else {
            // If the first name is simply an initial, search w/o it
            if (firstInitial && firstName !== '') {
                firstName = '';
                GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames,
                    runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
            }
            // Try again with only the maiden name of a hyphenated last name
            else if (lastName.includes("-")) {
                lastName = lastName.split('-')[0];
                GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames,
                    runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
            }            
            // Try again with different middle and last names combos
            else if (middleNamesString !== '' && middleNames.length > 0) {
                // Try every combo of right-most middle name removed
                if (middleNamesRemovalStep === 0) {
                    middleNames.pop();
                    if (middleNames.length === 0) {
                        middleNamesRemovalStep = 1;
                        middleNames = [...originalMiddleNames]; // Restore for next step
                    }
                    GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
                        runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
                }
                // Try every combo of left-most middle name removed
                else if (middleNamesRemovalStep === 1) {
                    middleNames.shift();
                    if (middleNames.length === 0) {
                        middleNamesRemovalStep = 2;
                        middleNames = [...originalMiddleNames]; // Restore for next step
                    }
                    GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
                        runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
                }
                else {
                    // Try again with the middle names as the last name (Maiden name and Spanish surnames)
                    middleNamesString = middleNames.join('+');
                    if (middleNamesRemovalStep === 2) {
                        middleNames.pop(); // Try every combo of right-most middle name removed
                        if(middleNameAsFirst.length === 0) {
                            middleNamesRemovalStep = 3;
                            middleNames = [...originalMiddleNames]; // Restore for next step
                        }
                    }
                    else {
                        middleNames.shift(); // Try every combo of left-most middle name removed
                    }
                    GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
                        runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);    
                }
            }
            // Try again with nicknames for the first name
            else if (runAgain && savedNicknames[originalFirstName]) {
                firstName = savedNicknames[originalFirstName][index];
                runAgain = savedNicknames[originalFirstName][index+1];
                index++;
                GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial,
                    middleNames, originalMiddleNames, runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
            }
            // Try again with the middle name as the first name
            else if (middleNamesString !== ''  && originalMiddleNames.length > 0 && !middleNameAsFirst) {
                firstName = originalMiddleNames[0];
                runAgain = true;
                middleNameAsFirst = true;
                GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
                    runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating); // Try again with nicknames for this name
            }
            // Try again with middle names
            else if (middleNamesString === '' && originalMiddleNames.length > 0){
                middleNamesString = middleNames.join('+');
                GetProfessorRating(newElem, fullName, lastName, originalLastName, firstName, originalFirstName, firstInitial, middleNames, originalMiddleNames, 
                    runAgain, index, middleNamesRemovalStep, middleNameAsFirst, middleNamesString, urlBase, linkifyRating);
            }
            // Set link to search results if not found
            else {
                newElem.textContent += "(NF)";
                const origMiddleNamesString = originalMiddleNames.join('+');
                newElem.setAttribute('href', 
                `https://www.ratemyprofessors.com/search.jsp?query=${originalFirstName}+${originalMiddleNames.length > 0 ? 
                origMiddleNamesString + '+': ''}${originalLastName}`);
            }
        }        
    });
}

function AddTooltip(element, allprofRatingsURL, realFullName, profRating, numRatings, easyRating, dept) {
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

                const div = document.createElement("div");
                const title = document.createElement("h3");
                title.textContent = "Rate My Professor Details";
                div.appendChild(title);
                const professorText = document.createElement("p");
                professorText.textContent = `${realFullName}, Professor in ${dept}`;
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
                    wouldTakeAgainText = document.createElement("p");
                    if (ratings.length >= 8 && wouldTakeAgainNACount < (ratings.length / 2)) {
                        wouldTakeAgain = ((wouldTakeAgain / (ratings.length - wouldTakeAgainNACount)) * 100).toFixed(0).toString() + "%";
                    } else {
                        wouldTakeAgain = "N/A";
                    }
                    wouldTakeAgainText.textContent = "Would take again: " + wouldTakeAgain;
                    div.appendChild(wouldTakeAgainText);
                    const topTagsText = document.createElement("p");
                    topTagsText.textContent = "Top Tags: ";
                    if (topTags.length > 0) {
                        for (let i = 0; i < topTags.length; i++) {
                            let tag = topTags[i][0];
                            topTagsText.textContent += `${tag}${i !== topTags.length - 1 ? ", " : ""}`;
                        }
                        div.appendChild(topTagsText);
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
                                side: 'right',
                                content: div,
                                contentAsHTML: true,
                                maxWidth: 400
                            })
                            .tooltipster('show');
                    }
                });
            }
        });
    }
    getRatings(allprofRatingsURL)
}