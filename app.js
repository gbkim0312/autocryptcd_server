const express = require('express');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');
// 웹으로부터 HTTP post 메세지 수신 허용
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/run-script', (req, res) => {
  const option = req.body;

  if (!option) {
    return res.status(400).json({ error: 'No options.' });
  }

  console.log('Received Options:', option);

  if (option.command === 'build' || option.command === 'test-device') {
    const worker = new Worker('./worker_code.js');
    // Worker을 따로 관리하는 부분 필요함
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    worker.on('message', (message) => {
      if (message.type === 'log') {
        res.write(`${message.data}`);
      } else if (message.type === 'end') {
        if (message.status === 'success') {
          //TODO: Client에 status code를 보내서 처리하도록
          res.write('data: Build successful\n\n');
        } else {
          res.write('data: Build failed\n\n');
        }
        res.end();
      }
    });

    worker.postMessage(option);
  } else {
    return res.status(400).json({ error: 'Invalid command.' });
  }

  // worker 종료하는 로직 추가
});


const port = 10101;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}.`);
});

function onClosing() {
  // worker 종료하는 로직 추가
  console.log('App is shutting down...');
}

server.on('close', onClosing);
process.on('SIGINT', onClosing);
process.on('SIGTERM', onClosing);

console.log("Server initialized.");
