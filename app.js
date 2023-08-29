// app.js

const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const { Mutex } = require('async-mutex');
const mutex = new Mutex();
const app = express();

app.use(bodyParser.json());

var queue = [];
var is_running = true;
var is_thread_running = true;

function processCommand(option) {
  switch (option.command) {
    case 'build':
      cmdBuild();
      break;
  }
}

function cmdBuild(option) {

  console.log('빌드 스크립트 실행 중');
  // 응답 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // client로 부터 받은 option을 args로 만들어서 빌드 스크립트로 전달

  const args = [
    option.username,
    option.timestamp,
    option.type,
    option.toolchain,
    option.standard,
    option.deviceName,
  ];

  // 값이 null이 아닐 때만 args에 추가
  if (option.rel !== null && option.rel !== undefined) {
    args.push(option.rel);
  } else {
    args.push(""); // 값이 null일 경우 빈 문자열을 추가하여 순서를 유지
  }
  if (option.hw !== null && option.hw !== undefined) {
    args.push(option.hw);
  } else {
    args.push("");
  }

  // 받은 옵션을 가지고 빌드 스크립트 실행
  const buildProcess = spawn('/workdir/securityplatform/scripts/test_build.sh', args, { cwd: '/workdir/securityplatform' });

  // 표준 출력 로그를 클라이언트로 전송
  buildProcess.stdout.on('data', (data) => {
    const logMessage = data.toString();
    console.log(logMessage);
    res.write(`${logMessage}`);
  });

  // 에러 로그를 클라이언트로 전송

  buildProcess.stderr.on('data', (data) => {
    const errorMessage = data.toString();
    console.error(errorMessage);
    res.write(`${errorMessage}\n`);

  });



  // 스크립트 실행 종료 처리

  buildProcess.on('close', (code) => {

    if (code === 0) {
      console.log('빌드 스크립트 실행 성공');
      res.write('build-done\ndata: success\n\n');
    } else {
      console.error('빌드 스크립트 실행 실패');
      res.write('build-done\ndata: failed\n\n');
    }

    res.end();

  });

}


function worker() {

  console.log("Worker started");
  while (is_running) {
    // mutex.waitForUnlock();
    var option = undefined;
    mutex.acquire();
    if (queue.length > 0) {
      option = queue[0];
      if (queue.length > 1) {
        queue = queue.slice(1, queue.length);
      } else {
        queue = [];
      }
    }
    mutex.release();
    if (option != undefined) {
      processCommand(option);
    }
    // sleep(100);
  }

  is_thread_running = false;
  console.log("Worker finished");
}



// POST 요청이 '/run-script' 경로로 들어올 때

app.post('/run-script', (req, res) => {

  const option = req.body; // 클라이언트에서 온 요청의 바디에 있는 옵션 정보를 받음
  if (!option) { // 옵션이 없으면 400 에러 응답
    return res.status(400).json({ error: 'No options. ' });
  }

  console.log('Received Options:', option); // 받은 옵션 출력
  // 허용하는 커맨드인지 체크만 하는 걸로
  if (option.command === 'build') { // 옵션의 'command'필드의 값이 'build'일 경우

    mutex.acquire();
    queue.push(option);
    mutex.release();
    return res.status(200);

  } else {
    return res.status(400).json({ error: '' });
  }

});

// 서버 포트 설정후 Listen

const port = 10101;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}.`);
});

function sleep(ms) {

  const wakeUpTime = Date.now() + ms;
  while (Date.now() < wakeUpTime) { }

}



function onClosing() {

  console.log('App is shutting down...');
  // is_running = false;

  // while (is_thread_running) {

  //   sleep(1);

  // }

}


server.on('close', onClosing);

// setTimeout(() => {
//   server.close(); // 일정 시간 후 서버 종료
// }, 5000);

process.on('SIGINT', onClosing);

// process.on('SIGINT', () => {
//   console.log('App is shutting down...');
//   // is_running = false;
//   // while (is_thread_running) {
//   //   sleep(1);
//   // }
// });

process.on('SIGTERM', onClosing);
console.log("Server initialized.");
setTimeout(worker, 0);