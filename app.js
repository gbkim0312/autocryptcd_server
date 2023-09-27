const express = require('express');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

var jobQueues = {};
var connections = {};

function workerMessageListener(username, res) {
  return (message) => {
    const currentIndex = connections[username].currentIndex;

    if (message.type === 'log') {
      res.write(`data: ${message.data}\n\n`);
    } else if (message.type === 'start') {
      res.write(`data: current-build-index: ${currentIndex}\n\n`);
    } else if (message.type === 'end') {
      if (message.status === 'success') {
        res.write('data: Build successful\n\n');
      } else {
        res.write('data: Build failed\n\n');
      }

      connections[username].currentIndex++;

      if (jobQueues[username].length) {
        const nextJob = jobQueues[username].shift();
        connections[username].worker.postMessage(nextJob);
      } else {
        res.end();
        connections[username].worker.removeListener('message', connections[username].listener);
        delete jobQueues[username];  // jobQueues[username] 삭제
      }
    }
  };
}

//TODO: command를 build 또는 Request로 보내고 난 뒤 특정 시간동안 아무론 응답이 없으면 connection 종료하기
app.post('/run-script', (req, res) => {
  const option = req.body;

  if (!option) {
    return res.status(400).json({ error: 'No options.' });
  }

  console.log('Received Options:', option);

  const username = option.username;

  if (option.command === 'request') {
    if (jobQueues[username]) {
      return res.status(400).json({ status: 'Deny', data: 'deny' });
    } else {
      jobQueues[username] = [];
      return res.status(200).json({ status: 'ok' });
    }
  }

  else if (option.command === 'sent-done') {
    const worker = connections[username] ? connections[username].worker
      : new Worker('./worker_code.js');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const listener = workerMessageListener(username, res);
    worker.on('message', listener);

    const firstJob = jobQueues[username].shift();
    worker.postMessage(firstJob);

    // 현재 연결 저장
    connections[username] = { worker, listener, res, currentIndex: 0 };
  }

  else if (option.command === 'reconnect') {
    // 종료
    if (connections[username]) {
      connections[username].res.write('data: Connection-Closed: New session started\n\n');
      connections[username].res.end();
      connections[username].worker.removeListener('message', connections[username].listener);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const worker = connections[username].worker;
    const listener = workerMessageListener(username, res);
    worker.on('message', listener);

    //현재 res와 listener을 등록
    connections[username] = { worker, listener, res, currentIndex: connections[username].currentIndex };
  }

  else if (option.command === 'build' || option.command === 'test-device') {
    jobQueues[username].push(option);
    res.status(200).json({ status: 'ok' });
  }

  else if (option.command === 'stop') {

    if (connections[username]) {
      // 연결 종료
      connections[username].res.write('data: Stopping session\n\n');
      connections[username].res.end();
      connections[username].worker.removeListener('message', connections[username].listener);

      // worker 종료
      connections[username].worker.terminate();

      // connection 삭제
      delete connections[username];
    }

    // jobQueues[username] 삭제
    if (jobQueues[username]) {
      delete jobQueues[username];
    }

    res.status(200).json({ status: 'ok' });

  }

  else {
    res.status(400);
  }
});

app.listen(10101, () => {
  console.log('Server is running on port 10101');
});
