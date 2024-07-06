const {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
} = require('@whiskeysockets/baileys');
const {
    handleListCommand,
    handleResetCommand,
    sendMenu,
} = require('./command');
const http = require('http');

const SESSION_FILE_PATH = './auth_info_baileys';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FILE_PATH);
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
            console.log(
                'connection closed due to ',
                lastDisconnect.error,
                ', reconnecting ',
                shouldReconnect
            );
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.message) return;

        const from = message.key.remoteJid;
        const messageType = Object.keys(message.message)[0];
        // console.log(JSON.stringify(m, undefined, 2));

        console.log('replying to', m.messages[0].key.remoteJid);
        console.log(m.messages[0].message.extendedTextMessage?.text);

        // Memeriksa apakah pesan berasal dari bot sendiri
        // if (message.key.fromMe) {
        //     await sock.sendMessage(from, {
        //         text: 'Pesan ini dari bot sendiri!',
        //     });
        //     return;
        // }

        if (
            messageType === 'conversation' ||
            messageType === 'extendedTextMessage'
        ) {
            const text =
                message.message.conversation ||
                message.message.extendedTextMessage.text;
            if (text.startsWith('.list ')) {
                await handleListCommand(sock, message);
            } else if (text === '.resetlist') {
                await handleResetCommand(sock, message);
            } else if (text === '.menu') {
                await sendMenu(sock, message);
            }
        }

        // view once fitur
        if (messageType === 'viewOnceMessageV2') {
            console.log('View Once message received');
            const viewOnceMessage = message.message[messageType].message;
            const innerMessageType = Object.keys(viewOnceMessage)[0];

            if (
                innerMessageType === 'imageMessage' ||
                innerMessageType === 'videoMessage'
            ) {
                console.log(`Inner message type: ${innerMessageType}`);
                const mediaMessage = viewOnceMessage[innerMessageType];
                if (
                    mediaMessage.caption &&
                    mediaMessage.caption.startsWith('.stail')
                ) {
                    const stream = await downloadContentFromMessage(
                        mediaMessage,
                        innerMessageType.replace('Message', '')
                    );
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    if (innerMessageType === 'imageMessage') {
                        await sock.sendMessage(from, {
                            image: buffer,
                            caption: '!stail',
                        });
                    } else if (innerMessageType === 'videoMessage') {
                        await sock.sendMessage(from, {
                            video: buffer,
                            caption: '!stail',
                        });
                    }
                }
            } else {
                console.log(
                    `Unexpected inner message type: ${innerMessageType}`
                );
            }
        } else if (messageType === 'extendedTextMessage') {
            console.log('Extended text message received');
            const quotedMessage =
                message.message.extendedTextMessage.contextInfo?.quotedMessage;
            if (quotedMessage?.viewOnceMessageV2) {
                const viewOnceMessage = quotedMessage.viewOnceMessageV2.message;
                const innerMessageType = Object.keys(viewOnceMessage)[0];

                if (
                    innerMessageType === 'imageMessage' ||
                    innerMessageType === 'videoMessage'
                ) {
                    console.log(
                        `Quoted inner message type: ${innerMessageType}`
                    );
                    const mediaMessage = viewOnceMessage[innerMessageType];
                    if (
                        message.message.extendedTextMessage.text.startsWith(
                            '.stail'
                        )
                    ) {
                        const stream = await downloadContentFromMessage(
                            mediaMessage,
                            innerMessageType.replace('Message', '')
                        );
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        if (innerMessageType === 'imageMessage') {
                            await sock.sendMessage(from, {
                                image: buffer,
                                caption: '!stail',
                            });
                        } else if (innerMessageType === 'videoMessage') {
                            await sock.sendMessage(from, {
                                video: buffer,
                                caption: '!stail',
                            });
                        }
                    }
                } else {
                    console.log(
                        `Unexpected quoted inner message type: ${innerMessageType}`
                    );
                }
            }
        } else {
            console.log(`Unexpected message type: ${messageType}`);
        }
    });

    sock.ev.on('disconnect', (reason) => {
        console.log('Disconnect whatsapp bot', reason);
    });
}

// menjalankan di file utama
connectToWhatsApp();

http.createServer((req, res) => {
    res.write('server running');
    res.end();
}).listen(8080);
