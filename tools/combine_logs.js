#!/usr/bin/env node

const fs = require('fs');

const userId = process.argv[2];

let auth = null;

fs.readdir('./', (err, files) => {
  const newJson = files
        .filter(f => {
          return f.includes(userId);
        })
        .reduce((arr, f) => {
          console.log('reading', f);
          let a = null;
          try {
            a = JSON.parse(fs.readFileSync(f));
          } catch (e) {
            console.error('error parsing', e);
          }
          if (a && a.length) {
            return arr.concat(a);
          } else {
            return arr;
          }
        }, []);
  const newFileName = `combined/${userId}.json`;
  console.log('writing out', newFileName);
  fs.writeFile(newFileName, JSON.stringify(newJson), (err) => {
    if (err) {
      console.error('could not write file', err);
    }
  });
});

