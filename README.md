# Any School Rate My Professors Extension

[**Chrome** extension][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/kkppfcnjkdgeocghmebigakljcpiamge.svg?label=%20">][link-chrome]

This extension shows the [Rate My Professors](https://www.ratemyprofessors.com/) ratings of professors while searching for classes on websites from a crowdsourced [Airtable](https://airtable.com/shrLerMYO0zwwLasr).

### Description
Professors' names will link to their Rate My Professors page (or the search results if not found). The most helpful rating is chosen as the most recent rating with the most net upvotes (regardless of the quality given). (The most helpful rating on Rate My Professors always has an "Awesome" overall quality.) Also, the "Would take again" value won't show up unless there are eight or more ratings and the majority of ratings answer that question. 

To better find professors, this extension will try the first part of a hyphenated last name, different middle/last name combos, and the middle name as the first name (common Southern tradition). It will also try all associated nicknames or diminutive names for first names from [here](https://github.com/carltonnorthern/nickname-and-diminutive-names-lookup). Lastly, it works with "last name, first name" notation, a first initial given instead of a first name, and only a last name given.

### Setup
- Check if your college class search website is already in the [Airtable](https://airtable.com/shrLerMYO0zwwLasr).
- If not, the edit link to the Airtable is [here](https://airtable.com/invite/l?inviteId=inv3Tecc8DWRnj58K&inviteToken=4f05cad586fc2b0ef1f9e95a814ce1be2ceacd835b93aac5c23b8ff9532566bc). Note: You must create an Airtable account if you don't have one to edit.
- Fill in the required fields to add your college's class search website. Read the field descriptions to help you.
- Install this extension if you haven't already.
- Go to the URL of the college class search website you just added.
- If the extension icon is grayed-out, click on it to refresh the supported URL's. (You may have to click on it again if Airtable has not yet pulled in the updated changes.) Click on the colored-in icon and give the extension permissions to the website.
- The page will refresh and professors ratings will be shown on the page.
- Changes from the Airtable will be reflected whenever you click on the extension icon.

### Screenshots
![Screenshot](images/screenshot.png)
![Screenshot](images/screenshot2.png)
![Screenshot](images/screenshot4.png)
![Screenshot](images/screenshot5.png)
![Screenshot](images/screenshot7.png)
![Screenshot](images/screenshot8.png)

[link-chrome]: https://chrome.google.com/webstore/detail/multi-college-rate-my-pro/kkppfcnjkdgeocghmebigakljcpiamge?hl=en&authuser=0 "Version published on Chrome Web Store"
