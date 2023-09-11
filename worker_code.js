// worker_code.js

const { parentPort } = require('worker_threads');
const { spawn } = require('child_process');

function cmdBuild(option) {
    console.log('빌드 스크립트 실행 중');

    const args = [
        option.commitNum,
        option.username,
        option.timestamp,
        option.type,
        option.toolchain,
        option.standard,
        option.deviceName,
    ];

    if (option.rel) {
        args.push(option.rel);
    } else {
        args.push("");
    }

    if (option.hw) {
        args.push(option.hw);
    } else {
        args.push("");
    }

    const buildProcess = spawn('/workdir/securityplatform/scripts/test_build.sh', args, { cwd: '/workdir/securityplatform' });

    // buildProcess에서 표준 출력 발생될 때마다 호출
    buildProcess.stdout.on('data', (data) => {
        const logMessage = data.toString();
        console.log(logMessage);
        parentPort.postMessage({ type: 'log', data: logMessage });
    });

    // buildProcess에서 표준 오류 발생될 때마다 호출
    buildProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error(errorMessage);
        parentPort.postMessage({ type: 'log', data: errorMessage });
    });

    // buildProcess가 종료될 때 호출
    buildProcess.on('close', (code) => {
        // 종료 코드가 0인 경우
        if (code === 0) {
            console.log('빌드 스크립트 실행 성공');
            parentPort.postMessage({ type: 'log', data: 'build-done: success' });
            parentPort.postMessage({ type: 'end', status: 'success' });
        }
        // 종료 코드가 0이 아닌 경우
        else {
            console.error('빌드 스크립트 실행 실패');
            parentPort.postMessage({ type: 'log', data: 'build-done: failed' });
            parentPort.postMessage({ type: 'end', status: 'failed' });
        }
    });
}

// test명령 수행
function cmdTestDevice(option) {
    console.log('테스트 디바이스 스크립트 실행 중');

    const args = [
        option.username,
        option.timestamp,
        option.url,
        option.package_name,
        option.host,
        option.port,

    ];

    const testDeviceProcess = spawn('/workdir/securityplatform/scripts/test_device.sh', args, { cwd: '/workdir/securityplatform' });

    testDeviceProcess.stdout.on('data', (data) => {
        const logMessage = data.toString();
        console.log(logMessage);
        parentPort.postMessage({ type: 'log', data: logMessage });
    });

    testDeviceProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error(errorMessage);
        parentPort.postMessage({ type: 'log', data: errorMessage });
    });
    f
    testDeviceProcess.on('close', (code) => {
        if (code === 0) {
            console.log('테스트 스크립트 실행 성공');
            parentPort.postMessage({ type: 'end', status: 'success' });
        } else {
            console.error('테스트 스크립트 실행 실패');
            parentPort.postMessage({ type: 'end', status: 'failed' });
        }
    });
}

// 부모 스레드로부터 메세지 수신
parentPort.on('message', (option) => {
    switch (option.command) {
        case 'build':
            cmdBuild(option);
            break;
        case 'test-device':
            cmdTestDevice(option);
            break;
        default:
            console.error('Unknown command:', option.command);
    }
});