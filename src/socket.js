import { uuidV4 } from "./utils";

class SocketJS {
  constructor() {
    this.ws = null;
    this.pingTimer = null;
    this.sessionId = uuidV4();
    this.userId = uuidV4();
    this.display = "";
  }
  connect(display, observers) {
    // this.ws = new WebSocket("wss://socketsbay.com/wss/v2/2/demo/");
    this.ws = new WebSocket("wss://socketsbay.com/wss/v2/1/demo/");
    this.display = display;
    this.ws.onopen = () => {
      observers.onSelfConnected({
        name: this.display,
        userId: this.userId,
        self: true,
      });
      this.sendKeepAlive();
      this.ws.send(
        JSON.stringify({
          event: "join",
          transaction: uuidV4(),
          sessionId: this.sessionId,
          payload: {
            name: display,
            userId: this.userId,
          },
        })
      );
    };
    this.ws.onclose = () => {
      this.ws = null;
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
    };
    this.ws.onerror = () => {
      this.ws.close();
      this.ws = null;
    };
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log("message recieved", data);
        const messageEvent = data.event;
        switch (messageEvent) {
          case "join":
            data.payload.self = false;
            observers.onUserConnected(data.payload);
            return;
          case "sdp":
            observers.onSdpOffer(data.payload);
            return;
          case "trickle":
            observers.onTrickleMessage(data.payload);
            return;
          case "sdpanswer":
            observers.onAnswerSdp(data.payload);
            return;
          default:
            return;
        }
      } catch (error) {
        console.log("Wrong message");
      }
    };
  }

  sendMessage(msg) {
    if (this.socketState() === 2) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendKeepAlive() {
    this.pingTimer = setInterval(() => {
      //   this.ws.send("ping");
    }, 10000);
  }

  sendTrickleMessage(ice) {
    const trickleMessage = {
      event: "trickle",
      transaction: uuidV4(),
      sessionId: this.sessionId,
      payload: {
        ice: ice,
        userId: this.userId,
      },
    };
    this.sendMessage(trickleMessage);
  }

  sendOffer(offer) {
    const offerMessage = {
      event: "sdp",
      transaction: uuidV4(),
      sessionId: this.sessionId,
      payload: { sdp: offer },
    };
    this.sendMessage(offerMessage);
  }
  sendAnswer(answer) {
    const answerMessage = {
      event: "sdpanswer",
      transaction: uuidV4(),
      sessionId: this.sessionId,
      payload: { sdp: answer },
    };
    this.sendMessage(answerMessage);
  }

  socketState() {
    if (!this.ws) return 0;
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 1;
      case WebSocket.OPEN:
        return 2;
      case WebSocket.CLOSING:
        return 3;
      case WebSocket.CLOSED:
        return 4;
      default:
        return 4;
    }
  }
}
export default SocketJS;
