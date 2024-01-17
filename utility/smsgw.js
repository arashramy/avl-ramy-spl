/* eslint-disable */
const request = require('request');
const { logger } = require('./customlog');
const { log } = require('debug');

function SMSService() {
    // for send sms
    const smsServiceInfo = {
        password:'',
        numbers: [''],
        endPoint: '',
    };

    async function sendSmsToNumber(message, receivers, checkStatus = false) {
        const { username, password, numbers, endPoint } = smsServiceInfo;

        let options = {
            url: endPoint,
            form: {
                username,
                password,
                from: numbers[0],
                to: Array.isArray(receivers) ? receivers.join(',') : receivers,
                text: message,
                isFlash: false,
            },
            timeout: 10000
        };

        return new Promise((resolve, reject) => {
            request.post(options, async function (err, res) {
                console.log("comming in promise sms ")
                console.log(options,"MRoptions")
                if (err) {
                    console.log("w000000")
                    resolve('پیام ارسال نشد')
                } else if (checkStatus === true) {
                    console.log("w1111111")

                    let body = JSON.parse(res.body);
                    let recID = body.Value;
                    setTimeout(()=>{resolve(SMSStatus(recID, receivers))}, 10000);
                } else {
                    console.log("2222222")
                    resolve()
                }
            });
        })
    }

    async function SMSStatus(recID, simNumber) {
        const { username, password, endPoint } = smsStatus;
        let options = {
            url: endPoint,
            form: {
                username,
                password,
                recID: recID
            }
        };
        return new Promise((resolve, reject) => {
             request.post(options, async function (err, res) {
                 if (err) {
                    console.log("L111111")

                     reject()
                 } else {
                    console.log("L222222")
                     let body = JSON.parse(res.body)
                     let value = body.Value
                     if (["1", "8"].includes(value)) {
                        console.log("L33333")

                         setTimeout(()=>{resolve(ReceiveSMSFromNumber(simNumber))}, 10000);
                     } else {
                        console.log("L4444444")

                         resolve("مشکلی در دلیور شدن پیام وجود دارد")
                     }
                 }
             });
        })
    }

    async function ReceiveSMSFromNumber(simNumber) {
        const { username, password, location, index, count, endPoint } = smsReceiveInfo;
        let options = {
            url: endPoint,
            form: {
                username,
                password,
                location,
                from: "",
                index,
                count,
            }
        };

        return new Promise((resolve, reject) => {
            request.post(options, async function (err, res) {
                if (err) {
                    reject()
                } else {
                    let response = JSON.parse(res.body)
                    let sender = response.Data[0].Sender
                    if (simNumber.includes(sender)) {
                        let data = response.Data[0].Body
                        resolve(data)

                    } else {
                        resolve("لطفا بعدا مجددا تلاش نمایید")
                    }
                }
            });
        })
    }

    return { sendSmsToNumber };
}

module.exports = { SMSGW: SMSService };
