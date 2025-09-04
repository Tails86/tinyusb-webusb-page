(function() {
  'use strict';

  if (!('usb' in navigator)) {
    window.addEventListener('DOMContentLoaded', () => {
      const warning = document.createElement('div');
      warning.style.background = '#ffdddd';
      warning.style.color = '#a00';
      warning.style.padding = '1em';
      warning.style.margin = '1em 0';
      warning.style.border = '1px solid #a00';
      warning.style.fontWeight = 'bold';
      warning.textContent = 'This browser does not support WebUSB. Use a Chromium-based browser such as Chrome, Edge, or Opera.';
      document.body.insertBefore(warning, document.body.firstChild);
    });
    return;
  }

  document.addEventListener('DOMContentLoaded', event => {
    let connectButton = document.querySelector("#connect");
    let statusDisplay = document.querySelector('#status');
    let port;
    let disconnecting = false;

    function addLine(linesId, text) {
      var senderLine = document.createElement("div");
      senderLine.className = 'line';
      var textnode = document.createTextNode(text);
      senderLine.appendChild(textnode);
      document.getElementById(linesId).appendChild(senderLine);
      return senderLine;
    }

    let currentReceiverLine;

    function appendLines(linesId, text) {
      const lines = text.split('\r');
      if (currentReceiverLine) {
        currentReceiverLine.innerHTML =  currentReceiverLine.innerHTML + lines[0];
        for (let i = 1; i < lines.length; i++) {
          currentReceiverLine = addLine(linesId, lines[i]);
        }
      } else {
        for (let i = 0; i < lines.length; i++) {
          currentReceiverLine = addLine(linesId, lines[i]);
        }
      }
    }

    function disconnect(reason = '') {
      if (!port || disconnecting) {
        // Nothing else to do
        return;
      }

      statusDisplay.textContent = 'Disconnecting...';
      disconnecting = true;

      port.disconnect().finally(() => {
        connectButton.textContent = 'Connect';
        statusDisplay.textContent = reason;
        port = null;
        disconnecting = false;
      });
    }

    function connect() {
      port.connect().then(() => {
        statusDisplay.textContent = '';
        connectButton.textContent = 'Disconnect';

        port.onReceive = data => {
          let textDecoder = new TextDecoder();
          console.log(textDecoder.decode(data));
          if (data.getInt8() === 13) {
            currentReceiverLine = null;
          } else {
            appendLines('receiver_lines', textDecoder.decode(data));
          }
        };
        port.onReceiveError = error => {
          console.error(error);
          disconnect('Lost connection with device');
        };
      }, error => {
        statusDisplay.textContent = error;
      });
    }

    connectButton.addEventListener('click', function() {
      if (port) {
        disconnect();
      } else {
        serial.requestPort().then(selectedPort => {
          port = selectedPort;
          connect();
        }).catch(error => {
          statusDisplay.textContent = error;
        });
      }
    });

    // Try to connect to first device when page is loaded
    // Note: this will only succeed when the page is running on localhost (see note in serial.js)
    serial.getPorts().then(ports => {
      if (ports.length === 0) {
        statusDisplay.textContent = 'No device found.';
      } else {
        statusDisplay.textContent = 'Connecting...';
        port = ports[0];
        connect();
      }
    });


    let commandLine = document.getElementById("command_line");

    commandLine.addEventListener("keypress", function(event) {
      if (event.keyCode === 13) {
        if (commandLine.value.length > 0) {
          addLine('sender_lines', commandLine.value);
          commandLine.value = '';
        }
      }

      port.send(new TextEncoder('utf-8').encode(String.fromCharCode(event.which || event.keyCode)));
    });
  });
})();
