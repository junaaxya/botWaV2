const { format, isSameDay } = require('date-fns');
const { id } = require('date-fns/locale');

let tilawahList = [];
let lastUpdate = new Date();

const handleListCommand = async (sock, message) => {
    const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text;

    if (!text) {
        await sock.sendMessage(message.key.remoteJid, {
            text: 'Pesan tidak memiliki teks.',
        });
        return;
    }

    const parts = text.split(' ');
    if (parts.length < 2) {
        await sock.sendMessage(message.key.remoteJid, {
            text: 'Silakan masukkan nama setelah perintah .list',
        });
        return;
    }
    const name = parts.slice(1).join(' ');

    const newToday = new Date();
    if (!isSameDay(newToday, lastUpdate)) {
        tilawahList = [];
        lastUpdate = newToday;
    }

    if (
        tilawahList.find(
            (item) => item.name.toLowerCase() === name.toLowerCase()
        )
    ) {
        await sock.sendMessage(message.key.remoteJid, {
            text: `${name} sudah ada dalam daftar.`,
        });
        return;
    }

    tilawahList.push({ name, status: '✅' });

    const today = new Date();
    const formattedDate = format(today, 'eeee, dd MMMM yyyy', { locale: id });

    let listMessage = `List Tilawah ${formattedDate}📝\n\n`;
    tilawahList.forEach((item, index) => {
        listMessage += `${index + 1}. ${item.name} ${item.status}\n`;
    });

    await sock.sendMessage(message.key.remoteJid, { text: listMessage });
};

const handleResetCommand = async (sock, message) => {
    tilawahList = [];
    lastUpdate = new Date();
    await sock.sendMessage(message.key.remoteJid, {
        text: 'Daftar list tilawah sudah di reset broww',
    });
};

const sendMenu = async (sock, message) => {
    const menu = `
┌───「 Menu 」───
│ ∘ .stail
│ ∘ .list <nama kamu>
│ ∘ .resetlist
└─────────────
    `;
    await sock.sendMessage(message.key.remoteJid, { text: menu });
};

module.exports = {
    handleResetCommand,
    handleListCommand,
    sendMenu,
};
