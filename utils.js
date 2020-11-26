function isInitial(str) {
    str = str.toLowerCase().replace('.', '');
    return str.length === 1 && str.match(/[a-z]/i);
}

// Convert "last name, first name" to "first name last name"
function normalizeNameOrder(fullName) {
    let normalizedName = new String(fullName);

    if (fullName.includes(',')) {
        const commaSplitName = fullName.split(',');
        normalizedName = `${commaSplitName[1]} ${commaSplitName[0]}`;
        normalizedName = normalizedName.trim();
    }

    return normalizedName;
}