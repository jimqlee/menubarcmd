
let supported_locales = {
    "zh-CN": "中文",
    "en-US": "English"
}

const getSupportedLocales = function () {
    return Object.keys(supported_locales)
}

const getLocaleLang = function(local) {
    return supported_locales[local]
}

module.exports = {
    getSupportedLocales,
    getLocaleLang
}