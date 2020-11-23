function isInitial(str) {
    str = str.toLowerCase().replace('.', '');
    return str.length === 1 && str.match(/[a-z]/i);
}