import { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, VideoOff, MicOff, Phone, Mic, Video } from 'lucide-react';
import { motion } from 'framer-motion';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const VideoCallModal = ({
  socket,
  currentUser,
  friend,
  incomingCall,
  onClose,
  isInitiator
}) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState('');

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const remoteUserId = isInitiator
    ? String(friend?._id)
    : String(incomingCall?.from);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopMedia();
    onClose();
  }, [onClose, stopMedia]);

  const createPeer = useCallback((localStream) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = peer;

    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (userVideo.current && remoteStream) {
        userVideo.current.srcObject = remoteStream;
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socket && remoteUserId) {
        socket.emit('iceCandidate', { to: remoteUserId, candidate: event.candidate });
      }
    };

    return peer;
  }, [socket, remoteUserId]);

  const initiateCall = useCallback(async (localStream) => {
    if (!socket || !remoteUserId) return;

    const peer = createPeer(localStream);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('callUser', {
      userToCall: remoteUserId,
      signalData: offer,
      from: String(currentUser.id),
      name: currentUser.username
    });
  }, [socket, remoteUserId, currentUser, createPeer]);

  const answerCall = useCallback(async () => {
    const localStream = streamRef.current;
    if (!socket || !incomingCall?.signal || !localStream) return;

    const peer = createPeer(localStream);
    await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit('answerCall', { signal: answer, to: String(incomingCall.from) });
    setCallAccepted(true);
  }, [socket, incomingCall, createPeer]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = localStream;
        if (myVideo.current) {
          myVideo.current.srcObject = localStream;
        }

        if (isInitiator && !incomingCall) {
          await initiateCall(localStream);
        }
      } catch (err) {
        console.error('Failed to get local stream', err);
        setError('Camera/Microphone permission denied.');
      }
    };

    setup();

    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [isInitiator, incomingCall, initiateCall, stopMedia]);

  useEffect(() => {
    if (!socket) return;

    const onCallAccepted = async (signal) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        setCallAccepted(true);
      } catch (err) {
        console.error('Failed to set remote description', err);
      }
    };

    const onIceCandidate = async (candidate) => {
      if (!peerRef.current || !candidate) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('ICE candidate error', err);
      }
    };

    const onEndCall = () => {
      cleanup();
    };

    socket.on('callAccepted', onCallAccepted);
    socket.on('iceCandidate', onIceCandidate);
    socket.on('endCall', onEndCall);

    return () => {
      socket.off('callAccepted', onCallAccepted);
      socket.off('iceCandidate', onIceCandidate);
      socket.off('endCall', onEndCall);
    };
  }, [socket, cleanup]);

  const endCall = () => {
    if (socket && remoteUserId) {
      socket.emit('endCall', { to: remoteUserId });
    }
    cleanup();
  };

  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = isVideoOff;
    setIsVideoOff(!isVideoOff);
  };

  const displayName = isInitiator
    ? friend?.username
    : incomingCall?.name;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-5xl bg-[#111] border border-[#ffffff1a] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(176,38,255,0.2)] flex flex-col h-[80vh] md:h-[90vh]"
      >
        <div className="p-4 border-b border-[#ffffff1a] flex justify-between items-center bg-black/50 z-20">
          <h2 className="text-xl font-bold flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2" />
            {incomingCall && !callAccepted
              ? `Incoming call from ${incomingCall.name}...`
              : callAccepted
                ? `On call with ${displayName}`
                : `Calling ${displayName}...`}
          </h2>
          <span className="text-[var(--color-neon-blue)] text-sm border border-[var(--color-neon-blue)] px-2 py-1 rounded-full">
            Video Call
          </span>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/20 text-red-400 text-sm text-center">{error}</div>
        )}

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {callAccepted ? (
            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-500 flex flex-col items-center">
              {incomingCall && !callAccepted ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] p-1 mb-4 animate-bounce">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-3xl font-bold text-white">
                      {incomingCall.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                  <p className="text-xl text-white mb-2">Incoming video call...</p>
                </>
              ) : (
                <div className="text-center animate-pulse">
                  <div className="w-24 h-24 rounded-full border-4 border-[var(--color-neon-purple)] mx-auto mb-4 border-t-transparent animate-spin" />
                  <p className="text-xl text-[var(--color-neon-blue)]">Connecting...</p>
                </div>
              )}
            </div>
          )}

          <div className="absolute top-4 right-4 w-32 md:w-48 aspect-[3/4] bg-black rounded-xl border-2 border-[var(--color-neon-pink)] overflow-hidden shadow-lg z-10">
            <video playsInline muted ref={myVideo} autoPlay className={`w-full h-full object-cover ${isVideoOff ? 'opacity-30' : ''}`} />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Camera off</div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-4 z-20">
          {incomingCall && !callAccepted ? (
            <>
              <button
                type="button"
                onClick={answerCall}
                title="Answer"
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all hover:scale-110"
              >
                <Phone className="w-6 h-6 text-white" />
              </button>
              <button
                type="button"
                onClick={endCall}
                title="Decline"
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all hover:scale-110"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {isMuted ? <MicOff className="text-white w-5 h-5" /> : <Mic className="text-white w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={endCall}
                title="End call"
                className="p-5 rounded-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all hover:scale-110"
              >
                <PhoneOff className="text-white w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {isVideoOff ? <VideoOff className="text-white w-5 h-5" /> : <Video className="text-white w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VideoCallModal;
