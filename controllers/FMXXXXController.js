require('safe_datejs');
const { VehicleModel } = require('../models/gpslocation');
const { GPSController } = require('./GPSController');
const { logger } = require('../utility/customlog');

class FMXXXXController extends GPSController {

    static parseRecord(buffer) {

        const record = {
            timestamp: parseInt(buffer.hexSlice(0, 8), 16),
            priority: buffer.readUInt8(8),
            longitude: buffer.readInt32BE(9) / 10 ** 7,
            latitude: buffer.readInt32BE(13) / 10 ** 7,
            attitude: buffer.readInt16BE(17),
            angle: buffer.readInt16BE(19),
            satelites: buffer.readUInt8(21),
            speed: buffer.readInt16BE(22),
            events: {},
        };
            console.log(record,"record")
        let index = 26;
        for (let eventLength = 1; eventLength <= 8; eventLength *= 2) {
            let totalSectionEvents = buffer.readUInt8(index);
            index += 1;
            while (totalSectionEvents) {
                totalSectionEvents -= 1;
                record.events[buffer.readUInt8(index)] = buffer.slice(
                    index + 1,
                    index + 1 + eventLength
                );
                index += 1 + eventLength;
            }
        }
        record.raw = buffer.slice(0, index);
        return record;
    }

    static async parsePacket(packet, socket) {
        try {

            console.log(packet,socket,"*********************************")
            if (packet.readUInt32BE(0) === 0) {
                const numberOfData = packet.readUInt8(9);
                let start = 10;
                let record;
                let lastData;
                for (let i = 0; i < numberOfData; i += 1) {
                    record = this.parseRecord(packet.slice(start));
                    const data = {
                        deviceName: 'FMXXXX',
                        date: new Date(record.timestamp),
                        IMEI: socket.IMEI,
                        lat: record.latitude,
                        lng: record.longitude,
                        speed: record.speed,
                        sat: record.satelites,
                        raw: record.raw,
                    };
                    this.savePacketData(data, record.priority > 0, lastData);
                    start += record.raw.length;
                    lastData = data;
                }
                const response = Buffer.alloc(4);
                response.writeUInt32BE(numberOfData);
                if (socket.readyState === 'open') socket.write(response);
            } else {
                const IMEILength = packet.readUInt16BE(0);
                const IMEI = packet.toString('utf8', 2, IMEILength + 2);
                if (await VehicleModel.exists({ deviceIMEI: IMEI })) {
                    socket.IMEI = IMEI;
                    if (socket.readyState === 'open')
                        socket.write(Buffer.from([1]));
                } else {
                    socket.end(Buffer.from([0]));
                }
            }
        } catch (ex) {
            logger.error(ex);
        }
    }
}

module.exports.FMXXXXController = FMXXXXController;
