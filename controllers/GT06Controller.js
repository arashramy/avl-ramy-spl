const { crc16 } = require('crc');
require('safe_datejs');
const { GPSController } = require('./GPSController');
const { NotifyUtility } = require('./NotifyUtility');
const { logger } = require('../utility/customlog');

class GT06Controller extends GPSController {
    static async parsePacket(packet, socket) {
        try {
            console.log("GT06Controller runned  ****")
            // console.log("socket",socket)
            // console.log("packet",packet)

            const protocolId = packet.readInt8(3).toString(16);
            if (protocolId === '13' || protocolId === '1') {
                if (socket.readyState === 'open')
                    socket.write(this.getAck(packet));
                socket.IMEI = packet.hexSlice(4, 12);
            } else if (protocolId === '12' || protocolId === '16') {
                const data =
                    protocolId === '12'
                        ? this.parseLocationPacket(packet, socket.IMEI)
                        : this.parseAlarmPacket(packet, socket.IMEI);
                await this.savePacketData({
                    deviceName: 'GT06',
                    protocolId,
                    ...data,
                    raw: packet,
                });
            }
            console.log("bye")


        } catch (ex) {
            logger.error(ex);
        }
    }

    static getAck(packet) {
        console.log("getAck runned")

        const data = Buffer.from([
            0x05,
            packet[3],
            packet[packet.length - 4],
            packet[packet.length - 3],
        ]);
        const crc = Buffer.from(crc16(data).toString(16), 'hex');
        return Buffer.from([0x78, 0x78, ...data, ...crc, 0x0d, 0x0a]);
    }

    static parseLocationPacket(packet, IMEI) {
        /* eslint-disable no-bitwise */
        const year = packet.readUInt8(4);
        const month = packet.readUInt8(5);
        const day = packet.readUInt8(6);
        const hour = packet.readUInt8(7);
        const minute = packet.readUInt8(8);
        const second = packet.readUInt8(9);
        const lngD = packet.readUInt8(20) & 0b1000 ? 'W' : 'E';
        const latD = packet.readUInt8(20) & 0b0100 ? 'N' : 'S';
        const lngV = (packet.readUInt32BE(15) / 60 / 30000).toFixed(7);
        const latV = (packet.readUInt32BE(11) / 60 / 30000).toFixed(7);
        // console.log("packet",packet)
        // console.log("IMEI",IMEI)

        return {
            date: this.getDate(year, month, day, hour, minute, second),
            sat: packet.readUInt8(10) & 0x0f,
            lat: latD === 'S' ? -latV : latV,
            lng: lngD === 'W' ? -lngV : lngV,
            speed: packet.readUInt8(19),
            IMEI,
        };
    }

    /**
     * According to https://forum.gps-trace.com/d/64-concox-gt06n-wrong-date/2
     * GT06 older devices has problems with the date roll over from 7 april 2019.
     * `getDate` sets buggy dates to now.
     */
    static getDate(year, month, day, hour, minute, second) {
        const now = new Date();
        const fullYear = Math.floor(now.getFullYear() / 100) * 100 + year;
        const date = new Date(fullYear, month, day, hour, minute, second);
        if (date > now || fullYear < now.getFullYear() - 1) {
            date.setFullYear(now.getFullYear());
            date.setMonth(now.getMonth());
            date.setDate(now.getDate());
            if (date > now) {
                const oneDay = 24 * 60 * 60 * 1000;
                date.setTime(+date - oneDay);
            }
        }
        return date;
    }

    static parseAlarmPacket(packet, IMEI) {
        const terminalInfo = packet.readUInt8(31);
        const alarmTable = [
            'Normal',
            'Shock alarm',
            'Power cut alarm',
            'Low battery alarm',
            'SOS',
        ];
        return {
            ...this.parseLocationPacket(packet, IMEI),
            fuelConnection: terminalInfo >> 7 ? 'disconnected' : 'connected',
            GPSTracking: terminalInfo & 0b1000000 ? 'off' : 'on',
            alarm: alarmTable[(terminalInfo >> 3) & 0b0111] || 'Normal',
            voltage: packet.readUInt8(32),
            signalStrength: packet.readUInt8(33),
        };
    }

    static setServer(req, res) {
        const { cellNumber } = req.params;
        NotifyUtility()
            .setServerAutomatic(cellNumber)
            .then(() => res({ msg: 'send' }).code(200))
            .catch(err => res({ msg: err }).code(404));
    }
}

module.exports.GT06Controller = GT06Controller;





