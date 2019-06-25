#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

const userId = process.argv[2];

let auth = null;
readline.question("username:", (un) => {
	readline.question("password:", (pw) => {
		let authorizationToEncode = `${un}:${pw}`;
		const _data = new Buffer(authorizationToEncode);
		auth = 'Basic ' + _data.toString('base64');
		readline.close()
    const ids = ['psds1001', 'psds1002', 'psds1003', 'psds1004'];
    ids.map(userId => {

      var dl = (num) => {
        return new Promise((resolve, reject) => {

          let queryString = '?';
          let query = {
            user_identifier: userId,
            "_kmd.ect": {
              "$gt": new Date('2019-06-08').toISOString()
            }
          };
          queryString += `query=${JSON.stringify(query)}&`;
          //queryString += 'sort={"_kmd.ect":-1}&';
          queryString += 'limit=50&';
          queryString += 'skip=' + num;
          num += 50;

		      const options = {
			      hostname: 'baas.kinvey.com',
			      port: 443,
			      path: '/appdata/kid_B1bNWWRsX/PSDSData' + queryString,
			      method: 'GET',
			      headers: {
				      'Authorization': auth
			      }
		      }

          let dataString = '';
		      const req = https.request(options, (res) => {
			      console.log(`statusCode: ${res.statusCode}`)

            if (res.statusCode == 200) {
			        res.on('data', (d) => {
                // console.log(d.toString());
                dataString += d.toString();
			        });
              res.on('error', (e) => {
                console.error('error:', e);
                reject();
              });
              res.on('end', () => {
                try {
                  if (dataString && dataString.length > 2) {
                    fs.writeFile(`${userId}_${num}.json`, dataString, (err) => {
                      if (err)
                        console.error('error writing ' + userId + ' file:', err);
                    });
                    resolve();
                  }
                } catch (e) {
                  console.error('data error', e);
                  reject(e);
                }
              });
            } else {
              res.on('data', (d) => {
                console.log('bad res:', d.toString());
              });
              res.on('end', () => {
                reject();
              });
            }
		      });

		      req.on('error', (error) => {
			      console.error('error', error)
            reject(error);
		      });

		      // now actually send the request
		      req.write('');
		      req.end();
        });
      }
      let n = 0;
      let id = setInterval(() => {
        dl(n)
          .catch(err => console.error);
        n+=50;
        if (n > 10000){
          clearInterval(id);
        }
      }, 500);
    });
	});
});


