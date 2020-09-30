let m, b, t;
let border = false;

document.addEventListener("DOMContentLoaded", function () {
    // get table
    t = document.getElementById("pattern");
});

var checkbox = document.getElementById("borders");
checkbox.addEventListener('change', function () {
    if (this.checked) {
        // Checkbox is checked
        border = true;
        document.getElementById("stitches").innerHTML = '10';
    } else {
        // Checkbox is not checked
        border = false;
        document.getElementById("stitches").innerHTML = '8';
    }
    knitIt();
});


function knitIt() {
    m = document.getElementById("message").value;
    // text to binary
    b = Util.toBinary(m);
    document.getElementById("binaryText").innerHTML = b.toString();
    // remove spaces
    b = b.replace(/\s/g, '');
    console.log(b);
    b = Array.from(b);
    console.log(b);



    // empty table
    for (let i = 0; i < t.rows.length; i++) {
        // t.deleteRow(i);
        t.innerHTML = '';
    }

    // FILL TABLE

    // first 4 rows are kpkp
    knitRow(); purlRow(); knitRow(); purlRow();


    // MESSAGE

    let n_rows = b.length / 8;
    for (let c = 0; c < n_rows; c++) {
        // for each char c in the message, make a new row

        let row = t.insertRow();

        // first cell is the character
        let td = document.createElement("td");
        let text = document.createTextNode(m[c]);
        td.style.color = "#4400ff";
        td.appendChild(text);
        row.appendChild(td);

        // second cell is the border
        if (border) {
            td = document.createElement("td");
            text = document.createTextNode("k");
            td.appendChild(text);
            row.appendChild(td);
        }

        // next 8 cells are the char in binary
        // format these!
        for (let i = 0; i < 8; i++) {
            td = document.createElement("td");
            let bin = b[c * 8 + i];
            // change binary for k and p
            if (bin == 0) { bin = 'k'; td.style.backgroundColor = "#6495ED"; }
            else if (bin == 1) { bin = 'p'; td.style.backgroundColor = "#4400ff"; }
            text = document.createTextNode(bin);
            td.style.color = "white";
            td.appendChild(text);
            row.appendChild(td);
        }

        // last cell is the border
        if (border) {
            td = document.createElement("td");
            text = document.createTextNode("k");
            td.appendChild(text);
            row.appendChild(td);
        }

        // add a purl row in between each message row
        purlRow();
    }


    // end with more kpkp
    knitRow(); purlRow(); knitRow(); purlRow();


}


function knitRow() {
    let row = t.insertRow();
    let td = document.createElement("td");
    let text = document.createTextNode("knit 1 row");
    td.style.paddingRight = "30px";
    td.appendChild(text);
    row.appendChild(td);
    let sts;
    if (border) sts = 10;
    else if (!border) sts = 8;
    for (let i = 0; i < sts; i++) {
        td = document.createElement("td");
        text = document.createTextNode("k");
        td.appendChild(text);
        row.appendChild(td);
    }
}

function purlRow() {
    let row = t.insertRow();
    let td = document.createElement("td");
    let text = document.createTextNode("purl 1 row");
    td.style.paddingRight = "30px";
    td.appendChild(text);
    row.appendChild(td);
    let sts;
    if (border) sts = 10;
    else if (!border) sts = 8;
    for (let i = 0; i < sts; i++) {
        td = document.createElement("td");
        text = document.createTextNode("p");
        td.appendChild(text);
        row.appendChild(td);
    }
}

// https://gist.github.com/belohlavek/90771ccccb11100e76d1
// Added a space between each byte for readability
var Util = {
	toBinary: function(input) {
		var result = "";
		for (var i = 0; i < input.length; i++) {
			var bin = input[i].charCodeAt().toString(2);
			result += Array(8 - bin.length + 1).join("0") + bin + ' ';
		} 
		return result;
	},

	toAscii: function(input) {
		var result = "";
		var arr = input.match(/.{1,8}/g);
		for (var i = 0; i < arr.length; i++) {
			result += String.fromCharCode(parseInt(arr[i], 2).toString(10));
		}
		return result;
	}
}
