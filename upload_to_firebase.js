var admin = require("firebase-admin");

var serviceAccount = require("/workdir/autocryptcdsystem-firebase-adminsdk-2s9al-52fd653e29.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://autocryptcdsystem-default-rtdb.asia-southeast1.firebasedatabase.app"
});


const db = admin.firestore();

const saveData = async (data) => {
  try {
    const docRef = await db.collection('build-history-device').add(data);
    console.log(`Document written with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error adding document:', error);
  }
};

const data = {
  commit_num: process.argv[2],
  device_name: process.argv[3],
  package_link: process.argv[4],
  result: process.argv[5],
  updated: admin.firestore.Timestamp.fromDate(new Date()),
  user: process.argv[6]
};

saveData(data);

