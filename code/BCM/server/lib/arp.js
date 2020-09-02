const sh = require("shelljs");

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
  let cmd = "arp -a";
  if (opts.interface) {
    cmd += " -i " + opts.interface;
  }
  const child = sh.exec(cmd, { silent: true });
  return parseAll(child.stdout);
}

/**
 * Parses arp scan data into a useable collection.
 */
function parseAll(data) {
  if (!data) {
    return [];
  }

  if (process.platform.includes("linux")) {
    const rows = data.split("\n");
    return rows.map(parseLinux).filter(Boolean);
  } else if (process.platform.includes("win32")) {
    const winRows = data.split("\n").splice(1);
    return winRows.map(parseWin32).filter(Boolean);
  }

  return data.trim().split("\n").map(parseRow).filter(Boolean);
}

/**
 * Reads the arp table for a single address.
 */
function arpOne(address) {
  if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
    return Promise.reject(new Error("Invalid IP address provided."));
  }

  const cmd = "arp -n " + address;
  const child = sh.exec(cmd, { silent: true });
  return parseOne(child.stdout);
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
    const rows = data.split("\n").slice(1)[0];
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
  const nameStart = 0;
  const nameEnd = row.indexOf("(") - 1;
  const name = row.slice(nameStart, nameEnd);

  // Parse ip.
  const ipStart = nameEnd + 2;
  const ipEnd = row.indexOf(")", ipStart);
  const ipAddress = row.slice(ipStart, ipEnd);
  // Parse mac
  const macStart = row.indexOf(" at ", ipEnd) + 4;
  const macEnd = row.indexOf(" on ", macStart);
  let macAddress = row.slice(macStart, macEnd);
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
  // Ignore unresolved hosts.
  if (row === "" || row.indexOf("incomplete") >= 0) {
    return;
  }

  const chunks = row.split(" ").filter(Boolean);
  if (parseOne) {
    return prepareOne(chunks);
  }
  return prepareAll(chunks);
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
