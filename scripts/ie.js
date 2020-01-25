function msieversion() {
    var userAgentStrings = ["msie", "trident"];
    var isIE = false;

    for (var i = 0; i < userAgentStrings.length; i++) {
        var ua = userAgentStrings[i];
        if (window.navigator.userAgent.toLowerCase().indexOf(ua) !== -1) {
            isIE = true;
            break;
        }
    }
    if (isIE) {
        console.log("**Browser not compatible!");
        document.body.style.display = "none";
        alert(
            "Browser not supported." +
                "\n\nTo take the speed test, please use either Chrome, Firefox, Edge or Safari." +
                "\n\nTo continue, click the Next button"
        );
        return true;
    }
    return false;
}

var isIE = false;
isIE = msieversion();
console.log(window.navigator.userAgent, isIE);
