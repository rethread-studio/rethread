const axios = require('axios');
const fs = require('fs');

axios.get('https://www.google.com/xjs/_/js/k=xjs.s.sv.v6qONVoTAxA.O/ck=xjs.s.HSt1nzlmbdk.L.W.O/m=Fkg7bd,HcFEGb,IvlUe,MC8mtf,OF7gzc,RMhBfe,T4BAC,TJw5qb,TbaHGc,Y33vzc,cdos,hsm,iDPoPb,jsa,mvYTse,tg8oTe,uz938c,vWNDde,ws9Tlc,yQ43ff,d,csi/am=BAAAsAjYuwOC_L8VAAACnwEAIMAt2GCBNCRUjNUBEQ/d=1/dg=2/br=1/ct=zgms/rs=ACT90oEAFkKAqSIb46QGMD4ke0ZvF8x72w')
  .then(response => {
    //console.log(response);
    fs.writeFile("testcode.js", response.data, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });

  })
  .catch(error => {
    console.log(error);
  });
  
console.log("After request");