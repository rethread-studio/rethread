const http = require('http');
const https = require('https');

// function returns a Promise
function getPromise(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (response) => {
			let chunks_of_data = [];

			response.on('data', (fragments) => {
				chunks_of_data.push(fragments);
			});

			response.on('end', () => {
				let response_body = Buffer.concat(chunks_of_data);
				resolve(response_body.toString());
			});

			response.on('error', (error) => {
				reject(error);
			});
		});
	});
}

// async function which will wait for the HTTP request to be finished
async function makeSynchronousRequest(request) {
	try {
		let http_promise = getPromise('https://www.google.com/xjs/_/js/k=xjs.s.sv.v6qONVoTAxA.O/ck=xjs.s.HSt1nzlmbdk.L.W.O/m=Fkg7bd,HcFEGb,IvlUe,MC8mtf,OF7gzc,RMhBfe,T4BAC,TJw5qb,TbaHGc,Y33vzc,cdos,hsm,iDPoPb,jsa,mvYTse,tg8oTe,uz938c,vWNDde,ws9Tlc,yQ43ff,d,csi/am=BAAAsAjYuwOC_L8VAAACnwEAIMAt2GCBNCRUjNUBEQ/d=1/dg=2/br=1/ct=zgms/rs=ACT90oEAFkKAqSIb46QGMD4ke0ZvF8x72w');
		let response_body = await http_promise;

		// holds response from server that is passed when Promise is resolved
		console.log(response_body);
		//console.log("Received everything")
	}
	catch(error) {
		// Promise rejected
		console.log(error);
	}
}

// some code 

// call the async function
makeSynchronousRequest();

console.log("After request");

// this code will be executed only when waiting for "makeSynchronousRequest" is finished
// some code