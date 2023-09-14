const express = require('express');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

var jobQueues = {};

app.post('/run-script', (req, res) => {
  const option = req.body;

  if (!option) {
    return res.status(400).json({ error: 'No options.' });
  }

  console.log('Received Options:', option);

  const username = option.username;

  if (!jobQueues[username]) {
    jobQueues[username] = [];
  }

  if (option.command === 'done') {

    const worker = new Worker('./worker_code.js');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    var currentIndex = 0;

    worker.on('message', (message) => {
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

        currentIndex++;

        if (jobQueues[username].length) {
          const nextJob = jobQueues[username].shift();
          worker.postMessage(nextJob);
        } else {
          res.end();
        }
      }
    });

    const firstJob = jobQueues[username].shift();
    worker.postMessage(firstJob);

  } else {
    jobQueues[username].push(option);
    res.status(200).json({ status: 'ok' });
  }
});


app.listen(10101, () => {
  console.log('Server is running on port 10101');
});

