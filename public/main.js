let localStream = null;
let peerConnection = null;
let socket = null;
let currentRoom = null;
// Инициализация Socket.IO
function initializeSocket() {
    // Используем текущий хост и порт
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port;
    const serverUrl = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;
    socket = io(serverUrl);
    socket.on('connect_error', (error) => {
        console.error('Ошибка подключения к серверу:', error);
    });
    socket.on('ready', async (roomInfo) => {
        console.log('Комната готова к соединению', roomInfo);
        // Инициатор создает оффер
        if (socket.id === roomInfo.initiator) {
            console.log('Создаю оффер как инициатор');
            await createOffer();
        }
        else {
            console.log('Жду оффер как п��лучатель');
        }
    });
    socket.on('offer', async (offer) => {
        console.log('Получен оффер:', offer);
        if (!peerConnection)
            await initializeCall();
        await handleOffer(offer);
    });
    socket.on('answer', async (answer) => {
        console.log('Получен ответ:', answer);
        await handleAnswer(answer);
    });
    socket.on('ice-candidate', async (candidate) => {
        if (!peerConnection)
            return;
        try {
            console.log('Получен ICE кандидат:', candidate);
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        catch (error) {
            console.error('Ошибка при добавлении ICE кандидата:', error);
        }
    });
    socket.on('room-full', () => {
        alert('Комната заполнена!');
    });
    socket.on('user-disconnected', () => {
        console.log('Другой пользователь отключился');
        updateConnectionStatus(false);
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
            remoteVideo.srcObject = null;
        }
    });
    socket.on('disconnect', () => {
        console.log('Отключено от сервера');
        updateConnectionStatus(false);
    });
}
function updateConnectionStatus(isConnected) {
    const statusBadge = document.getElementById('connectionStatus');
    const statusMessage = document.getElementById('statusMessage');
    if (statusBadge && statusMessage) {
        if (isConnected) {
            statusBadge.classList.remove('status-disconnected');
            statusBadge.classList.add('status-connected');
            statusBadge.textContent = 'Подключен';
            statusMessage.textContent = 'Видеосвязь установлена';
        }
        else {
            statusBadge.classList.remove('status-connected');
            statusBadge.classList.add('status-disconnected');
            statusBadge.textContent = 'Не подключен';
            statusMessage.textContent = 'Введите ID комнаты для начала разговора';
        }
    }
}
async function initializeCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && currentRoom) {
                socket.emit('ice-candidate', event.candidate, currentRoom);
            }
        };
        // Добавляем обработчик состояния подключения
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection?.connectionState);
            if (peerConnection?.connectionState === 'connected') {
                updateConnectionStatus(true);
            }
            else if (peerConnection?.connectionState === 'disconnected' ||
                peerConnection?.connectionState === 'failed') {
                updateConnectionStatus(false);
            }
        };
        localStream.getTracks().forEach((track) => {
            if (localStream && peerConnection) {
                peerConnection.addTrack(track, localStream);
            }
        });
        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remoteVideo');
            remoteVideo.srcObject = event.streams[0];
            // Обновляем статус при получении видеопотока
            updateConnectionStatus(true);
        };
    }
    catch (error) {
        console.error('Ошибка при инициализации медиа:', error);
        updateConnectionStatus(false);
    }
}
async function createOffer() {
    if (!peerConnection || !currentRoom)
        return;
    try {
        console.log('Создаю оффер...');
        const offer = await peerConnection.createOffer();
        console.log('Оффер создан:', offer);
        await peerConnection.setLocalDescription(offer);
        console.log('Локальное описание установлено');
        socket.emit('offer', offer, currentRoom);
        console.log('Оффер отправлен');
    }
    catch (error) {
        console.error('Ошибка при создании предложения:', error);
    }
}
async function handleOffer(offer) {
    if (!peerConnection)
        return;
    try {
        console.log('Обработка оффера...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('Удаленное описание установлено');
        const answer = await peerConnection.createAnswer();
        console.log('Ответ создан:', answer);
        await peerConnection.setLocalDescription(answer);
        console.log('Локальное описание установлено');
        socket.emit('answer', answer, currentRoom);
        console.log('Ответ отправлен');
    }
    catch (error) {
        console.error('Ошибка при обработке предложения:', error);
    }
}
async function handleAnswer(answer) {
    if (!peerConnection)
        return;
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
    catch (error) {
        console.error('Ошибка при установке удаленного описания:', error);
    }
}
// Экспортируем joinRoom для использования в HTML
export async function joinRoom() {
    const roomId = document.getElementById('roomId').value;
    if (!roomId)
        return;
    currentRoom = roomId;
    await initializeCall();
    socket.emit('join-room', roomId);
}
// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    window.joinRoom = joinRoom;
});
