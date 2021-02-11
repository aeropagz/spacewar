class Gateway {
  constructor() {
    this.connected = false;
    this.restart_auto = true;
    this.callback = [];
  }

  start() {
    this.connection = new WebSocket("sampleUrl");

    this.connection.onopen = this.on_open.bind(this);
    this.connection.onmessage = this.on_message.bind(this);
    this.connection.onclose = this.on_close.bind(this);
    this.connection.onerror = this.on_error.bind(this);
  }
  stop() {
    this.restart_auto = false;
    this.connection.close();
  }

  on_open() {
    this.connected = true;

    console.log("gateway ready");
  }
  on_message(message) {
    for (const cb of this.callback) {
      cb(message.data);
    }
  }
  on_close() {
    this.connected = false;

    console.log("gateway close");

    if (!this.restart_auto) {
      this.restart_auto = true;
      return;
    }

    setTimeout(() => {
      console.log("gateway reconnecting");
      this.start();
    }, 3000);
  }

  on_error(error) {
    throw new Error(error);
  }

  send(data) {
    if (!this.connected) {
      return;
    }

    this.connection.send(JSON.stringify(data));
  }

  feed(callback) {
    this.callback.push(callback);
  }
}

export default Gateway;
