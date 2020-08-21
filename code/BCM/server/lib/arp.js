const sh = require("exec-sh");

/**
 * Finds all local devices (ip and mac address) connected to the current network.
 */
module.exports = function findLocalDevices(opts) {
  if (opts && opts.address != null) {
    return arpOne(opts.address);
  }
  return arpAll(opts);
};

/**
 * Reads the arp table.
 */
function arpAll(opts) {
  return new Promise((resolve) => {
    cmd = "arp -a";
    if (opts.interface) {
      cmd += " -i " + opts.interface;
    }
    child = sh(cmd, true, function (err, stdout, stderr) {
      const data = parseAll(stdout);
      return resolve(data);
    });
  });
}

/**
 * Parses arp scan data into a useable collection.
 */
function parseAll(data) {
  if (!data) {
    return [];
  }

  if (process.platform.includes("linux")) {
    var rows = data.split("\n");
    return rows
      .map(function (row) {
        return parseLinux(row);
      })
      .filter(Boolean);
  } else if (process.platform.includes("win32")) {
    var winRows = data.split("\n").splice(1);
    return winRows
      .map(function (row) {
        return parseWin32(row);
      })
      .filter(Boolean);
  }

  return data
    .trim()
    .split("\n")
    .map(function (row) {
      return parseRow(row);
    })
    .filter(Boolean);
}

/**
 * Reads the arp table for a single address.
 */
function arpOne(address) {
  if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
    return Promise.reject(new Error("Invalid IP address provided."));
  }

  return new Promise((resolve) => {
    cmd = "arp -n " + address;
    child = sh(cmd, true, function (err, stdout, stderr) {
      const data = parseOne(stdout);
      return resolve(data);
    });
  });
}

/**
 * Parses a single row of arp data.
 */
function parseOne(data) {
  if (!data) {
    return;
  }

  if (process.platform.includes("linux")) {
    // ignore unresolved hosts (can happen when parseOne returns only one unresolved host)
    if (data.indexOf("no entry") >= 0) {
      return;
    }
    // remove first row (containing "headlines")
    var rows = data.split("\n").slice(1)[0];
    return parseLinux(rows, true);
  } else if (process.platform.includes("win32")) {
    return; // currently not supported
  }

  return parseRow(data);
}
/**
 * Parses each row in the arp table into { name, ip, mac }.
 */
function parseRow(row) {
  // Parse name.
  var nameStart = 0;
  var nameEnd = row.indexOf("(") - 1;
  var name = row.slice(nameStart, nameEnd);

  // Parse ip.
  var ipStart = nameEnd + 2;
  var ipEnd = row.indexOf(")", ipStart);
  var ipAddress = row.slice(ipStart, ipEnd);
  // Parse mac
  var macStart = row.indexOf(" at ", ipEnd) + 4;
  var macEnd = row.indexOf(" on ", macStart);
  var macAddress = row.slice(macStart, macEnd);
  // Ignore unresolved hosts.
  if (macAddress === "(incomplete)") {
    return;
  }
  // Format for always 2 digits
  macAddress = macAddress
    .replace(/^.:/, "0$&")
    .replace(/:.(?=:|$)/g, ":0X$&")
    .replace(/X:/g, "");

  return {
    name: name,
    ip: ipAddress,
    mac: macAddress,
  };
}

function parseLinux(row, parseOne) {
  var result = {};

  // Ignore unresolved hosts.
  if (row === "" || row.indexOf("incomplete") >= 0) {
    return;
  }

  var chunks = row.split(" ").filter(Boolean);
  if (parseOne) {
    result = prepareOne(chunks);
  } else {
    result = prepareAll(chunks);
  }
  return result;
}

function prepareOne(chunks) {
  return {
    name: "?", // a hostname is not provided on the raspberry pi (linux)
    ip: chunks[0],
    mac: chunks[2],
  };
}

function prepareAll(chunks) {
  const r = chunks[1].match(/\((.*)\)/);
  if (!r) {
    return null;
  }
  return {
    name: chunks[0],
    ip: chunks[1].match(/\((.*)\)/)[1],
    mac: chunks[3],
  };
}
