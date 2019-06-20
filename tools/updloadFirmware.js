#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

if (process.argv.length < 5) {
	console.error('You must provide: file path, uploaded name, and version string!');
	process.exit(1);
}

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

function versionStringToByte(version) {
    const [major, minor] = version.split('.');
    return (parseInt(major) << 4) | parseInt(minor);
}

const fileName = process.argv[2];
const uploadName = process.argv[3];
const versionString = process.argv[4];
const versionNumber = versionStringToByte(versionString);
const versionDecimal = parseFloat(versionString);
let fileData = null;

try {
	fileData = fs.readFileSync(fileName);
} catch (e) {
	console.error(`Could not open ${fileName}: ${err}`);
	process.exit(1);
}

if (!fileData) {
	console.error(`Could not open ${fileName}: unknown error!`);
	process.exit(1);
}

const metadata = JSON.stringify({
	"_public": true,
	"_filename": uploadName,
	"_version": versionDecimal,
	"version": versionString,
	"size": fileData.length,
	"mimeType": "application/octet-stream",
	"firmware_file": true,
	"translation_file": false,
	"change_notes": {
		"en": [],
		"es": [],
		"de": [],
		"fr": [],
		"nl": [],
		"ja": [],
		"ko": [],
		"zh": []
	},
})

let auth = null;
readline.question("username:", (un) => {
	readline.question("password:", (pw) => {
		let authorizationToEncode = `${un}:${pw}`;
		const data = new Buffer(authorizationToEncode);
		auth = 'Basic ' + data.toString('base64');
		readline.close()

		const options = {
			hostname: 'baas.kinvey.com',
			port: 443,
			path: '/blob/kid_SyIIDJjdM/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Kinvey-Content-Type': 'application/octet-stream',
				'Authorization': auth
			}
		}

		const req = https.request(options, (res) => {
			//console.log(`statusCode: ${res.statusCode}`)

			res.on('data', (d) => {
				// have uploaded the metadata - now upload the file to google
				// cloud storage
				const data = JSON.parse(d.toString());
				const requiredHeaders = data['_requiredHeaders'];
				const url = data['_uploadURL'].replace('http://storage.googleapis.com', '');
				//console.log(`uploading to url: ${url}`);

				const uploadOptions = {
					hostname: 'storage.googleapis.com',
					path: url,
					method: 'PUT',
					headers: {
						'Content-Length': fileData.length,
						'Content-Type': 'application/octet-stream'
					}
				};
				// add any required headers
				Object.keys(requiredHeaders).map(k => {
					uploadOptions.headers[k] = requiredHeaders[k];
				});
				let uploadReq = https.request(uploadOptions, (res2) => {
					console.log(`upload status: ${res2.statusCode}`);
				});
				uploadReq.on('error', (error) => {
					console.error(error);
				});
				// now acutally upload the file
				uploadReq.write(fileData);
				uploadReq.end();
			});
		});

		req.on('error', (error) => {
			console.error(error)
		});

		// now actually send the request
		req.write(metadata)
		req.end()

	});
});


