const SpeedSMSText = (speed, maxSpeed, IMEI, shortLink, driverFamilyName) => `کاوه AVL
${driverFamilyName} گرامی
سرعت غیرمجاز!
آدرس: ${shortLink}`;

const ZoneSMSText = (point, polygon, IMEI, address, driverName) => `Kaveh AVL
جناب ${driverName}
مکان شما خارج از محدوده مجاز است.
آدرس: ${address}
مکان: ${point}
IMEI: ${IMEI}`;

const BackToZoneSMSText = (IMEI, driverName) => `Kaveh AVL
جناب ${driverName}
شما به محدوده مجاز بازگشتید.
IMEI: ${IMEI}`;

const DelayLocation = (group, number) => `Kaveh AVL
در گروه ${group} تعداد ${number} دستگاه موقعیتشان بیشتر از ۵ روز است که دریافت نشده است. برای اطلاعات بیشتر ایمیل خود را چک کنید.`;

module.exports = {
    SpeedSMSText,
    ZoneSMSText,
    BackToZoneSMSText,
    DelayLocation,
};
