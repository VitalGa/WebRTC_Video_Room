declare const io: any;

let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;
let socket: any = null;
let currentRoom: string | null = null;

// Инициализация Socket.IO
function initializeSocket() {
  // Используем текущий хост и порт
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port;
  const serverUrl = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;

  socket = io(serverUrl);

  socket.on('connect_error', (error: Error) => {
    console.error('Ошибка подключения к серверу:', error);
  });

  socket.on('ready', async (roomInfo: { initiator: string; receiver: string }) => {
    console.log('Комната готова к соединению', roomInfo);

    // Инициатор создает оффер
    if (socket.id === roomInfo.initiator) {
      console.log('Создаю оффер как инициатор');
      await createOffer();
    } else {
      console.log('Жду оффер как получатель');
    }
  });

  socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
    console.log('Получен оффер:', offer);
    if (!peerConnection) await initializeCall();
    await handleOffer(offer);
  });

  socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
    console.log('Получен ответ:', answer);
    await handleAnswer(answer);
  });

  socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection) return;
    try {
      console.log('Получен ICE кандидат:', candidate);
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Ошибка при добавлении ICE кандидата:', error);
    }
  });

  socket.on('room-full', () => {
    alert('Комната заполнена!');
  });

  socket.on('user-disconnected', () => {
    console.log('Другой пользователь отключился');
    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
    if (remoteVideo.srcObject) {
      (remoteVideo.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject = null;
    }
  });
}

async function initializeCall() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentRoom) {
        socket.emit('ice-candidate', event.candidate, currentRoom);
      }
    };

    localStream.getTracks().forEach((track) => {
      if (localStream && peerConnection) {
        peerConnection.addTrack(track, localStream);
      }
    });

    peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      remoteVideo.srcObject = event.streams[0];
    };
  } catch (error) {
    console.error('Ошибка при инициализации медиа:', error);
  }
}

async function createOffer() {
  if (!peerConnection || !currentRoom) return;

  try {
    console.log('Создаю оффер...');
    const offer = await peerConnection.createOffer();
    console.log('Оффер создан:', offer);
    await peerConnection.setLocalDescription(offer);
    console.log('Локальное описание установлено');
    socket.emit('offer', offer, currentRoom);
    console.log('Оффер отправлен');
  } catch (error) {
    console.error('Ошибка при создании предложения:', error);
  }
}

async function handleOffer(offer: RTCSessionDescriptionInit) {
  if (!peerConnection) return;

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
  } catch (error) {
    console.error('Ошибка при обработке предложения:', error);
  }
}

async function handleAnswer(answer: RTCSessionDescriptionInit) {
  if (!peerConnection) return;

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (error) {
    console.error('Ошибка при установке удаленного описания:', error);
  }
}

// Экспортируем joinRoom для использования в HTML
export async function joinRoom() {
  const roomId = (document.getElementById('roomId') as HTMLInputElement).value;
  if (!roomId) return;

  currentRoom = roomId;
  await initializeCall();
  socket.emit('join-room', roomId);
}

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initializeSocket();
  window.joinRoom = joinRoom;
});

// Добавляем определение для TypeScript
declare global {
  interface Window {
    joinRoom: typeof joinRoom;
  }
}