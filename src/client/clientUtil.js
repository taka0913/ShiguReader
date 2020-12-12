const util = require("@common/util");
const Cookie = require("js-cookie");
const _ = require("underscore");
const filesizeUitl = require('filesize');
var count = 0;

module.exports.filesizeUitl = function (num) {
    if (isNaN(num)) {
        return "";
    }

    return filesizeUitl(num, { base: 2 });
}

module.exports.getDir = function (fn) {
    if (!fn) { return ""; }
    const tokens = fn.split('\\');
    return tokens.slice(0, tokens.length - 1).join('\\');
};

const getBaseName = module.exports.getBaseName = function (fp) {
    if (arguments.length > 1) {
        throw "getBaseName error"
    }

    if (!fp) { return ""; }

    // this function will take file path/or web url
    // so it need to decide seperator will be used
    let seperator = "/";  //   / is used by linux and web url
    if (fp.match(/[A-Za-z]:\\/)) {
        //match windows path
        seperator = "\\";
    }
    const tokens = fp.split(seperator);
    return tokens[tokens.length - 1];
};

module.exports.getFileUrl = function (url) {
    return "../" + encodeFileUrl(url);
}

const encodeFileUrl = module.exports.encodeFileUrl = function (url) {
    if (!url) {
        return "";
    }
    const ii = url.lastIndexOf('/') + 1;
    const result = url.substring(0, ii) + encodeURIComponent(url.substring(ii));
    return result;
}

const getBaseNameWithoutExtention = module.exports.getBaseNameWithoutExtention = function (fn) {
    if (!fn) {
        return "";
    }
    const tokens = getBaseName(fn).split(".");
    if (tokens.length < 2) {
        return fn;
    } else {
        return tokens.slice(0, tokens.length - 1).join(".");
    }
};

module.exports.isIOS = function () {
    // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

const isMobile = module.exports.isMobile = function () {
    // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
    return /Mobi/.test(navigator.userAgent) && !window.MSStream;
}

module.exports.getPerPageItemNumber = function () {
    if (isMobile()) {
        return 3 * 6;
    } else {
        return 4 * 6;
    }
}

module.exports.sortFileNames = function (files) {
    util._sortFileNames(files, getBaseNameWithoutExtention);
}

module.exports.isLocalHost = function () {
    return location.hostname.includes("localhost");
}

module.exports.isAuthorized = function () {
    if (location.hostname.includes("localhost")) {
        return true;
    } else {
        const Cookie = require("js-cookie");
        const userConfig = require('@config/user-config');
        const password = Cookie.get('password');
        return userConfig.file_change_password === password;
    }
}

module.exports.isAllowedToEnter = function () {
    const userConfig = require('@config/user-config');
    if (!userConfig.home_password) {
        return true;
    }

    const Cookie = require("js-cookie");
    const password =  Cookie.get('home-password');
    
    const user =  Cookie.get('home-user');
    const password2 =  Cookie.get('home-password2');
    const Recaptcha =  Cookie.get('home-Recaptcha');
    const button =  Cookie.get('home-button');

    const now = new Date();
    var time_hour = now.getHours();

    if(button === "1"){
        if((time_hour<=7 || time_hour >=24) && (userConfig.home_user.indexOf(user) != 0 || userConfig.home_password[userConfig.home_user.indexOf(user)] !== password)){
            alert("0時～7時まではログインできません");
            Cookie.set("home-button", "0", { expires: 3 });
            return (false);
        }
        else if(userConfig.home_user.indexOf(user) !== -1 && count <= 30){
            if(userConfig.home_password[userConfig.home_user.indexOf(user)] === password && userConfig.home_password2.indexOf(password2) !== -1 && Recaptcha === "1"){
                return (true);
            }
        }
        alert("入力された情報が正しくありません");
        Cookie.set("home-button", "0", { expires: 3 });
        count = count + 1;
    }

    return (false);
}

// module.exports.cleanSearchStr = function(str){
//     // search/ケマオ9% will break everything
//     // it is too troublesome to do everything in url encoding 
//     //FYI, the doujin that make me release this is   (C98) [ケマオ9% (おな丸)] 鹿島とぱっこぱこ・弐 愛情は鹿島の胸に。 (艦隊これくしょん -艦これ-)

//     //  "1233%123123%%".replace(/(%)+$/g, "")   =>  "1233%123123" 
//     return  str && str.replace(/(%)+$/g, "")
// }

module.exports.getSearchInputText = function () {
    const input = document.getElementsByClassName('search-input');
    return input[0] && input[0].value || "";
}

module.exports.isSearchInputTextTyping = function () {
    const input = document.getElementsByClassName('search-input');
    return input[0] && input[0] === document.activeElement;
}

module.exports.getExplorerLink = function (path) {
    return '/explorer/?p=' + encodeURIComponent(path);
}

module.exports.getSearhLink = function (path) {
    return "/search/?s=" + encodeURIComponent(path);
}

module.exports.getTagLink = function (path) {
    return "/tag/?t=" + encodeURIComponent(path);
}

module.exports.getAuthorLink = function (path) {
    return "/author/?a=" + encodeURIComponent(path);
}

module.exports.getOneBookLink = function (path) {
    return "/onebook/?p=" + encodeURIComponent(path);
}

module.exports.getOneBookOverviewLink = function (path) {
    return "/onebookOverview/?p=" + encodeURIComponent(path);
}

module.exports.getOneBookWaterfallLink = function (path) {
    return "/onebookWaterfall/?p=" + encodeURIComponent(path);
}

module.exports.getVideoPlayerLink = function (path) {
    return "/videoPlayer/?p=" + encodeURIComponent(path);
}

module.exports.getDownloadLink = function (path) {
    if (!path) { return ""; }
    return "/api/download/?p=" + encodeURIComponent(path);
}

function stringHash(str) {
    const stringHash = require("string-hash");
    const result = stringHash(str);
    window.localStorage && window.localStorage.setItem(result, str)
    return result;
};

function getPathFromLocalStorage(hash) {
    return window.localStorage && window.localStorage.getItem(hash);
}

const cookie_expire_days = 5;

module.exports.saveFilePathToCookie = function (path) {
    //!!! 413 error. if the cookie become too big
    const now = util.getCurrentTime();
    const hash = stringHash(path);
    Cookie.set(now, hash, { expires: cookie_expire_days })
}

module.exports.getHistoryFromCookie = function () {
    const timeToHash = Cookie.get();
    let times = _.keys(timeToHash);
    times = _.sortBy(times);

    const visited = {};
    const history = [];

    times.forEach(t => {
        const hash = timeToHash[t];
        const filePath = getPathFromLocalStorage(hash);
        if (visited[filePath] || !filePath) {
            return;
        }
        visited[filePath] = true;
        try {
            const time = new Date(+t);
            history.push([time, filePath])
        } catch{
            //cookie may be dirty
        }
    });

    return history;
}