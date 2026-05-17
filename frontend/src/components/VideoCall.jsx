import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, PhoneForwarded } from 'lucide-react';

export default function VideoCall({ 
  socket, 
  currentUser, 
  activeCall, 
  onEndCall 
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  const isCaller = activeCall.isCaller;
  const partnerName = activeCall.partnerName;
  const incomingSignal = activeCall.signal;

  useEffect(() => {
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice_candidate', {
              to: partnerName,
              candidate: event.candidate
            });
          }
        };

        if (isCaller) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('call_user', {
            userToCall: partnerName,
            signalData: offer
          });
        } else if (incomingSignal) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingSignal));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer_call', {
            to: partnerName,
            signal: answer
          });
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    }
    
    setupMedia();

    const handleCallAccepted = async (signal) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    };

    const handleIceCandidate = async (candidate) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    };

    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate_received', handleIceCandidate);

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket.off('call_accepted', handleCallAccepted);
      socket.off('ice_candidate_received', handleIceCandidate);
    };
  }, [socket, isCaller, partnerName, incomingSignal]);

  const endCall = () => {
    socket.emit('end_call', { to: partnerName });
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onEndCall();
  };

  return (
    <div className="video-modal">
      <h2 style={{ color: 'white', marginBottom: '20px' }}>
        {isCaller ? `Calling ${partnerName}...` : `In call with ${partnerName}`}
      </h2>
      <div className="video-grid">
        <div className="video-container">
          <video playsInline muted ref={localVideoRef} autoPlay />
          <div className="video-label">You</div>
        </div>
        <div className="video-container">
          {remoteStream ? (
            <video playsInline ref={remoteVideoRef} autoPlay />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b92a5' }}>
              Waiting for video...
            </div>
          )}
          <div className="video-label">{partnerName}</div>
        </div>
      </div>
      <div className="call-controls">
        <button className="control-btn btn-end" onClick={endCall}>
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
