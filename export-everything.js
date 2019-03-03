const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');
const serviceAccount = require("./serviceAccountKey.json");
const rimraf = require("rimraf");

let targetPath = process.argv[2];
targetPath = targetPath ? targetPath : './default-export'
// let subCollection = process.argv[3];

// You should replace databaseURL with your own
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://constellation-dev-18ed2.firebaseio.com"
});

let db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

const collectionSet = (fsPath, firestoreParentPath, collection, docId) => {
  console.log('DEBUG: ', fsPath, firestoreParentPath, collection)
  const joinedFsPath = fsPath + '/' + `${docId}${collection}`;
  fs.mkdirSync(joinedFsPath)
  const joinedFirestorePath = firestoreParentPath + '/' + collection;
  db.collection(joinedFirestorePath).get().then(docsSnapshot => {
    docsSnapshot.forEach(doc => {
      doc.ref.getCollections().then(subcollections => {
        for (let subcollection of subcollections) {
          console.log(`Found subcollection with id: ${subcollection.id}`);
          collectionSet(joinedFsPath, joinedFirestorePath + '/' + doc.id, subcollection.id, `[${doc.id}]`)
        }
      });

      const fullFilePath = joinedFsPath + '/' + doc.id + '.json';
      fs.writeFile(fullFilePath, JSON.stringify(doc.data()), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("Saved: ", fullFilePath);
      });
    })
  })
}

if (__dirname !== path.resolve(targetPath)) {
rimraf(targetPath, () => {
  console.log("Cleared target path: ", targetPath);
  fs.mkdirSync(targetPath)

  db.getCollections().then(collections => {
    for (let collection of collections) {
      console.log(`Found collection with id: ${collection.id}`);
      const fsPath = targetPath
      collectionSet(fsPath, '', collection.id, '')
    }
  });
});
} else {
  console.error('You cannot use the same path as the source files! Did you forget to provide a path?')
}

// db.getAll().then(documents => {
//   for (let document of documents) {
//     console.log(`Found document with id: ${document.id}`)
//   }
// });

// let data = {};
// data[collectionName] = {};

// let results = db.collection(collectionName)
// .get()
// .then(snapshot => {
//   snapshot.forEach(doc => {
//     data[collectionName][doc.id] = doc.data();
//   })
//   return data;
// })
// .catch(error => {
//   console.log(error);
// })

// results.then(dt => {
//   getSubCollection(dt).then(() => {
//     // Write collection to JSON file
//     fs.writeFile("firestore-export.json", JSON.stringify(data), function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("The file was saved!");
//     });
//   })
// })

// async function getSubCollection(dt){
//   for (let [key, value] of Object.entries([dt[collectionName]][0])){
//     if(subCollection !== undefined){
//       data[collectionName][key]['subCollection'] = {};
//       await addSubCollection(key, data[collectionName][key]['subCollection']);
//     }
//   }
// }

// function addSubCollection(key, subData){
//   return new Promise(resolve => {
//     db.collection(collectionName).doc(key).collection(subCollection).get()
//     .then(snapshot => {
//       snapshot.forEach(subDoc => {
//         subData[subDoc.id] =  subDoc.data();
//         resolve('Added data');
//       })
//     })
//   })
// }
