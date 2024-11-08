export interface RTCSessionDescriptionInit {
  sdp: string;
  type: RTCSdpType;
}

export interface PeerConnection {
  connection: RTCPeerConnection;
  videoStream: MediaStream | null;
}
