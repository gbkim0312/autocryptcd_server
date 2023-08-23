const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();
app.use(bodyParser.json()); //json 형태의 Body를 Parsing함

app.post('/run-script', (req, res) => {
  // body를 Option으로 불러옴
  const option = req.body;

  // 클라이언트가 올바른 요청을 보냈는지 확인
  if (!option) {
    return res.status(400).json({ error: 'Invalid or missing option in the request body.' });
  }

  // 받은 옵션 출력
  console.log('Received Options:', option);

  // 'command' 필드가 'build'일 경우에만 처리
  if (option.command === 'build') {
    console.log('빌드 스크립트 실행 중');

    // 서버가 클라이언트로 실시간 데이터 전송 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 빌드 스크립트에 전달할 인자들 설정
    const args = [
      option.timestamp,                // 타임스탬프
      option.type,                     // 타입 (device or Commit Number)
      option.toolchain,                // 툴체인
      option.standard,                 // 표준 (camp122, ydt3957, esti...)
      option.rel || "",                // 릴리즈 버전 (값이 없을 경우 빈 문자열로 설정)
      option.hw || "",                 // 하드웨어 (값이 없을 경우 빈 문자열로 설정)
      option.deviceName || ""          // 디바이스 이름 (값이 없을 경우 빈 문자열로 설정)
    ];

    // 빌드 스크립트 실행 및 로그 처리 (자식 프로세스에서 진행)
    const buildProcess = spawn('/workdir/securityplatform/scripts/test_build.sh', args, { cwd: '/workdir/securityplatform' });

    // 빌드 스크립트의 출력을 클라이언트로 전송
    buildProcess.stdout.on('data', (data) => {
      const logMessage = data.toString();
      console.log(logMessage);
      res.write(`${logMessage}`);
    });

    // 빌드 스크립트의 오류 출력을 클라이언트로 전송
    buildProcess.stderr.on('data', (data) => {
      const errorMessage = data.toString();
      console.error(errorMessage);
      res.write(`${errorMessage}\n`);
    });

    // 스크립트 실행 완료 후 처리
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
  } else {
    // 'command' 필드가 'build'가 아닐 경우 에러 반환
    return res.status(400).json({ error: 'Invalid script name in buildOptions.' });
  }
});

// 앱 포트 설정
const port = 10101;
app.listen(port, () => {
  console.log(`App listening on port ${port}.`);
});
