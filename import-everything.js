const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const firebase = require('firebase')
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const fileName = process.argv[2];
const targetPath = process.argv[2];

const reDate = new RegExp(/^date/);
const reGeo = new RegExp(/^geo/);

let dateArray = process.argv.filter(item => item.match(reDate))[0];
let geoArray = process.argv.filter(item => item.match(reGeo))[0];

if (dateArray) {
  dateArray = dateArray.split('=')[1].split(',');
}

if (geoArray) {
  geoArray = geoArray.split('=')[1].split(',');
}

// You should replace databaseURL with your own
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://constellation-dev-18ed2.firebaseio.com"
});

const db = admin.firestore();
db.settings({ timestampsInSnapshots: true });
const regexpOwn = /\[(.*?)\]/g

const importData = async (fsPath, firestorePath) => {
  console.log(fsPath, firestorePath, path.resolve(fsPath), fs.existsSync(path.resolve(fsPath)))

  const correctDates = (jsonObj, maxDepth) => {
    if (maxDepth === 0) {
      return jsonObj
    }
    Object.keys(jsonObj).forEach(key => {
      if (jsonObj[key].hasOwnProperty('_nanoseconds') && jsonObj[key].hasOwnProperty('_seconds')) {
        jsonObj[key] = new firebase.firestore.Timestamp(jsonObj[key]._seconds, jsonObj[key]._nanoseconds); //new Date(jsonObj[key]._seconds * 1000);
      }
      Object.keys(jsonObj[key]).forEach(subKey => correctDates(jsonObj[key][subKey], maxDepth - 1))
    })
    return jsonObj;
  }

  if (fs.existsSync(path.resolve(fsPath))) {
    console.log(fsPath, 'exists')
    // 1. iterate over the files/folders
    // 2. if file then upload at path - targetPath
    const contents = fs.readdirSync(fsPath, {withFileTypes: true})
    console.log('found ', contents.length, 'items')

    contents.forEach(async (entry) => {
      console.log('evaluating', entry.name, 'now...', entry.isDirectory(), entry.isFile())
      if (entry.isFile() && !entry.isDirectory() && entry.name !== '.DS_Store') {
        const jsonData = fs.readFileSync(fsPath + '/' + entry.name, {encoding: 'utf8'})
        const jsonObject = JSON.parse(jsonData)

        const fixedDateJsonData = correctDates(JSON.parse(jsonData), 8)
        await db.doc(firestorePath + '/' + entry.name.replace('.json', '')).set(JSON.parse(jsonData))
        console.warn(firestorePath + '/' + entry.name.replace('.json', ''))
        console.dir(fixedDateJsonData)
      } else if (entry.isDirectory()) {
        if (entry.name.match(regexpOwn) === null) {
          importData(fsPath + '/' + entry.name, firestorePath + '/' + entry.name)
        } else {
          const owner = entry.name.match(regexpOwn)[0].replace('[','').replace(']','');
          const collectionName = entry.name.replace(regexpOwn, '');
          importData(fsPath + '/' + entry.name, firestorePath + '/' + owner + '/' + collectionName)
        }
      }
    })
  }
}

importData(path.resolve(targetPath), '')

// const fixDataProp = (jsonObj) => {
//   Object.keys(jsonObj).forEach(key => {
//     if (jsonObj[key].hasOwnProperty('_nanoseconds') && jsonObj[key].hasOwnProperty('_seconds')) {
//       jsonObj[key] = new Date(jsonObj[key]._seconds * 1000);
//     }
//     Object.keys(jsonObj[key]).forEach(fixDataProp(jsonObj[key][subKey]))
//   })
//   return jsonObj;
// }

// fs.readFile(fileName, 'utf8', function(err, data){
//   if(err){
//     return console.log(err);
//   }

//   // Turn string from file to an Array
//   if (fileName.endsWith('yaml') || fileName.endsWith('yml')) {
//     dataArray = YAML.safeLoad(data);
//   } else {
//     dataArray = JSON.parse(data);
//   }

//   udpateCollection(dataArray);

// })

// async function udpateCollection(dataArray){
//   console.log(dataArray)
//   for(const index in dataArray){
//     const collectionName = index;
//     for(const doc in dataArray[index]){
//       console.log(doc)
//       if(dataArray[index].hasOwnProperty(doc)){
//         await startUpdating(collectionName, doc, dataArray[index][doc]);
//       }
//     }
//   }
// }

// function startUpdating(collectionName, doc, data){
//   // convert date from unixtimestamp
//   let parameterValid = true;

//   // Enter date value
//   if(typeof dateArray !== 'undefined') {
//     dateArray.map(date => {
//       if (data.hasOwnProperty(date)) {
//         data[date] = new Date(data[date]._seconds * 1000);
//       } else {
//         console.log('Please check your date parameters!!!', dateArray);
//         parameterValid = false;
//       }
//     });
//   }

//   // Enter geo value
//   if(typeof geoArray !== 'undefined') {
//     geoArray.map(geo => {
//       if(data.hasOwnProperty(geo)) {
//         data[geo] = new admin.firestore.GeoPoint(data[geo]._latitude, data[geo]._longitude);
//       } else {
//         console.log('Please check your geo parameters!!!', geoArray);
//         parameterValid = false;
//       }
//     })
//   }

//   if(parameterValid) {
//     return new Promise(resolve => {
//       db.collection(collectionName).doc(doc)
//       .set(data)
//       .then(() => {
//         console.log(`${doc} is imported successfully to firestore!`);
//         resolve('Data wrote!');
//       })
//       .catch(error => {
//         console.log(error);
//       });
//     });
//   } else {
//     console.log(`${doc} is not imported to firestore. Please check your parameters!`);
//   }
// }
