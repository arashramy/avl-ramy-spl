/* eslint-disable */
const request = require('request');

function ShortenerLink() {

    function zayaShortenerLink(url) {
        let options = {
            url: ``,
            method: 'post',
            headers: {
                'Authorization': 'Bearer YOviEaeNfOTextUvfkuCIKPFncVBVPBUCgOGXNAOMnDLYrMMgVQdowP2VnJo',
                'content-type': 'application/x-www-form-urlencoded'
            },
            form: { 'url': url }
        };
        return new Promise(function (resolve, reject) {
            request(options, function (error, res, body) {

                if (!error && JSON.parse(body).status === 200) {
                    resolve(JSON.parse(body).data.short_url);
                } else {
                    reject();
                }
            });
        });
    }

    return { zayaShortenerLink };
}

module.exports = { ShortenerLink };