import "./App.css";
import { useRef, useState } from "react";
import SocketJS from "./socket";
function App() {
  const socketRef = useRef(null);
  const demoRef = useRef({
    slefParticipant: null,
    remoteParticipant: null,
  });

  const [displayName, setDisplayName] = useState("");
  const [connected, setConnected] = useState(false);

  const handleDisplayNameChange = (event) => {
    setDisplayName(event.target.value);
  };

  const joinRoom = () => {
    connectSocket();
  };

  const observers = {
    onSelfConnected(user) {
      user.self = true;
      demoRef.current.slefParticipant = user;
      setConnected(true);
      generateStream(demoRef.current.slefParticipant);
    },
    onUserConnected(user) {
      console.log("userconnected", user);
      user.self = false;
      demoRef.current.remoteParticipant = user;
      // createPeerConncetion(demoRef.current.remoteParticipant);
    },
    onSdpOffer(offerSdp) {
      console.log("offer sdp", offerSdp);
      handleOffer(offerSdp.sdp);
    },
    onTrickleMessage(trickle) {
      handleCandidate(trickle);
    },
    onAnswerSdp(answerSdp) {
      handleAnswer(answerSdp.sdp);
    },
  };

  const connectSocket = () => {
    socketRef.current = new SocketJS();
    socketRef.current.connect(displayName, observers);
  };

  const generateStream = async (participant) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      participant.stream = stream;
      createPeerConncetion(participant);
      if (participant.self) {
        const videoElement = document.getElementById("publisher");
        videoElement.srcObject = stream;
      }
    } catch (error) {
      console.log(`getUserMedia() error: ${error.name}`);
    }
  };

  const createPeerConncetion = (participant) => {
    console.log("createPeerConncetion", participant);
    const configurations = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    participant.peerConnection = new RTCPeerConnection(configurations);
    listenPeerConnctionEvent(participant);
    if (participant.self) {
      generateSDP(participant);
    } else {
    }
  };

  const listenPeerConnctionEvent = (participant) => {
    const peerConnection = participant.peerConnection;
    if (!peerConnection) return;
    peerConnection.addEventListener("connectionstatechange", () => {
      console.log(
        `peer connection  state  changed in : ${peerConnection.connectionState}`
      );
    });
    peerConnection.addEventListener("negotiationneeded", () => {
      console.log("peer connection  negotiation is needed");
    });
    peerConnection.addEventListener("icegatheringstatechange", () => {
      console.log("peer connection  icegatheringstatechange");
    });
    peerConnection.addEventListener("icecandidate", (event) => {
      console.log("peer connection icecandidate");
      handleIceCandidate(event.candidate);
    });
    peerConnection.addEventListener("iceconnectionstatechange", () => {
      console.log("peer connection video iceconnectionstatechange");
    });
    peerConnection.ontrack = function (event) {
      console.log("Remote track flowing....");
      const videoElement = document.getElementById("subscriber");
      const stream = event.streams[0];
      console.log("Video elemt", videoElement, stream);
      videoElement.srcObject = stream;
    };
    if (participant.self) {
      participant.stream.getTracks().forEach(function (track) {
        peerConnection.addTrack(track, participant.stream);
      });
    }
  };

  const handleIceCandidate = (candidate) => {
    var candidateToSend = null;
    if (!candidate || candidate.candidate.indexOf("endOfCandidates") > 0) {
      candidateToSend = "complete";
    } else {
      candidateToSend = {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      };
    }
    socketRef.current.sendTrickleMessage(candidateToSend);
  };

  const generateSDP = (participant) => {
    const peerConnection = participant.peerConnection;
    const offerOptions = {
      offerToReceiveAudio: 0,
      offerToReceiveVideo: 0,
    };

    peerConnection.createOffer(offerOptions).then((offer) => {
      peerConnection.setLocalDescription(offer).then((sdp) => {
        console.log("sdp", JSON.stringify(offer));
        participant.sdp = offer;
        sendSdpOffer(offer);
      });
    });
  };

  const sendSdpOffer = (offer) => {
    const offerMessage = {
      type: "offer",
      jsep: offer,
    };
    socketRef.current.sendOffer(offerMessage);
  };

  const handleOffer = async (offer) => {
    const remoteParticipant = demoRef.current.remoteParticipant;
    createPeerConncetion(demoRef.current.remoteParticipant);
    console.log("Offerrrrrr", offer);
    await remoteParticipant.peerConnection.setRemoteDescription(offer.jsep);

    const answer = await remoteParticipant.peerConnection.createAnswer();

    const answerSdp = {
      type: "answer",
      jsep: answer,
    };
    socketRef.current.sendAnswer(answerSdp);
    await remoteParticipant.peerConnection.setLocalDescription(answer);
  };

  const handleAnswer = async (answer) => {
    const participant = demoRef.current.slefParticipant;
    await participant.peerConnection.setRemoteDescription(answer.jsep);
  };

  const handleCandidate = async (trickle) => {
    const participant = demoRef.current.remoteParticipant;
    console.log("candidateeee", participant, trickle.ice);
    if (trickle.ice === "complete") {
      await participant.peerConnection.addIceCandidate(null);
    } else {
      await participant.peerConnection.addIceCandidate(trickle.ice);
    }
  };

  return (
    <div className="App">
      <div className="container">
        {!connected ? (
          <div className="section">
            <form className="formJoin">
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={handleDisplayNameChange}
              />
              <button type="button" className="joinButton" onClick={joinRoom}>
                Join
              </button>
            </form>
          </div>
        ) : (
          <div className="videosection">
            <video id="publisher" autoPlay muted />
            <video id="subscriber" autoPlay />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
