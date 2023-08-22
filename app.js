const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();
app.use(bodyParser.json());

// app.post('/run-script', (req, res) => {
//   const { script } = req.body;
//   if (!script) {
//     return res.status(400).json({ error: 'Missing script in the request body.' });
//   }

//   if (script === 'test_build') {
//     console.log('빌드 스크립트 실행 중');

//     // SSE 응답 헤더 설정
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');

//     // 연결 성공 응답 보내기
//     res.status(200).write('Connected to server.\n\n');

//     // Execute the provided script file using spawn to get real-time output
//     const buildProcess = spawn(`/workdir/securityplatform/scripts/test_build.sh`);

//     buildProcess.stdout.on('data', (data) => {
//       const logMessage = data.toString();
//       console.log(logMessage);

//       if (!res.finished) { // 응답이 아직 끝나지 않았다면
//         res.write(`${logMessage}`);
//       }
//     });

//     buildProcess.stderr.on('data', (data) => {
//       const errorMessage = data.toString();
//       console.error(errorMessage);

//       if (!res.finished) { // 응답이 아직 끝나지 않았다면
//         res.write(`data: ${errorMessage}\n\n`);
//       }
//     });

//     buildProcess.on('close', (code) => {
//       if (!res.finished) { // 응답이 아직 끝나지 않았다면
//         if (code === 0) {
//           console.log('빌드 스크립트 실행 성공');
//           res.write('event: build-done\ndata: success\n\n');
//         } else {
//           console.error('빌드 스크립트 실행 실패');
//           res.write('event: build-done\ndata: failed\n\n');
//         }
//         res.end();
//       }
//     });
//   } else {
//     return res.status(400).json({ error: 'Invalid script name.' });
//   }
// });

app.post('/run-script', (req, res) => {
  const option = req.body;

  if (!option) {
    return res.status(400).json({ error: 'Invalid or missing option in the request body.' });
  }

  if (option.type === 'build') {
    console.log('빌드 스크립트 실행 중');

    // 스크립트의 옵션을 구성합니다.
    const command = `/workdir/securityplatform/build.sh`;
    const args = [
      `--standard=${option.standard}`,
      `--hw=${option.hw}`,
      `--atlk=${option.rel}`,
      `--toolchain=${option.toolchain}`,
      // option.option
    ];

    const buildProcess = spawn(command, args);

    // 로그를 실시간으로 클라이언트로 전송합니다.
    buildProcess.stdout.on('data', (data) => {
      res.write(data);  // 실시간 로그 데이터를 클라이언트에 전송합니다.
    });

    buildProcess.stderr.on('data', (data) => {
      res.write(data);  // 오류 메시지도 실시간으로 클라이언트에 전송합니다.
    });

    buildProcess.on('exit', (code) => {
      res.status(code === 0 ? 200 : 500).end();
    });

  } else {
    return res.status(400).json({ error: 'Invalid script name in buildOptions.' });
  }
});


const port = 10101;
app.listen(port, () => {
  console.log(`App listening on port ${port}.`);
});

