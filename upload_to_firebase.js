var admin = require("firebase-admin");

var serviceAccount = require("/workdir/autocryptcdsystem-firebase-adminsdk-2s9al-52fd653e29.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://autocryptcdsystem-default-rtdb.asia-southeast1.firebasedatabase.app"
});


const db = admin.firestore();

const document_id = process.argv[2];
const type = process.argv[3];

const saveData = async (docId, data) => {

  var docRef;
  try {
    if (type === 'device') {
      docRef = await db.collection('build-history-device').doc(docId).set(data);
    } else {
      docRef = await db.collection('build-history-toolchain').doc(docId).set(data);
    }
    console.log(`Document written with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error adding document:', error);
  }
};


//TODO: Toolchain 정보도 추거
const data = {
  commit_num: process.argv[4],
  device_name: process.argv[5],
  package_link: process.argv[6],
  result: process.argv[7],
  updated: admin.firestore.Timestamp.fromDate(new Date()),
  user: process.argv[8],
  toolchain: process.argv[9],
  standard: process.argv[10],
  autotalks_sdk: process.argv[11],
  hw: process.argv[12],
};

saveData(document_id, data);


