const IPCheckRange = require("ip-check-range");

function hostContains(packet, str) {
  if (packet.remote_host && packet.remote_host.indexOf(str) > -1) {
    return true;
  }
  if (packet.local_host) {
    return packet.local_host.indexOf(str) > -1;
  }
  return false;
}
function ipInRange(packet, range) {
  if (typeof range == "string") {
    if (packet.local_ip == range) {
      return true;
    }
    if (packet.remote_ip == range) {
      return true;
    }
    return false;
  }
  if (IPCheckRange(packet.local_ip, [range])) {
    return true;
  }
  if (IPCheckRange(packet.remote_ip, [range])) {
    return true;
  }
  return false;
}
module.exports = function (packet) {
  const output = new Set();
  if (hostContains(packet, "duckduckgo")) {
    output.add("DuckDuckGo");
  }
  if (hostContains(packet, "mozilla")) {
    output.add("Mozilla");
  }
  if (hostContains(packet, "dropbox")) {
    output.add("Dropbox");
  }
  if (hostContains(packet, "microsoft") || hostContains(packet, "msedge.net")) {
    output.add("Microsoft");
  }
  if (hostContains(packet, "office")) {
    output.add("Microsoft");
    output.add("Office");
  }
  if (
    ipInRange(packet, "13.64-107.0-255.0-255") ||
    ipInRange(packet, "40.74-125.0-127.0-255") ||
    ipInRange(packet, "52.96-115.0-255.0-255")
  ) {
    output.add("Microsoft");
  }

  if (hostContains(packet, "instagram")) {
    output.add("Instagram");
  }
  if (hostContains(packet, "apple") || hostContains(packet, "ios") || hostContains(packet, "itunes")) {
    output.add("Apple");
  }
  if (hostContains(packet, "twitter")) {
    output.add("Twitter");
  }
  if (
    hostContains(packet, "googlemail") ||
    hostContains(packet, "inbox.google.com")
  ) {
    output.add("Gmail");
  }
  if (hostContains(packet, "yahoo")) {
    output.add("Yahoo");
  }
  if (
    hostContains(packet, "youtube") ||
    hostContains(packet, "googlevideo") ||
    hostContains(packet, "ytimg") ||
    hostContains(packet, "ytstatic")
  ) {
    output.add("Youtube");
  }
  if (
    hostContains(packet, "google") ||
    hostContains(packet, "gstatic") ||
    hostContains(packet, "1e100.net")
  ) {
    output.add("Google");
  }
  if (hostContains(packet, "wordpress")) {
    output.add("Wordpress");
  }
  if (hostContains(packet, "kth")) {
    output.add("KTH");
  }
  if (hostContains(packet, "aws") || hostContains(packet, "amazon")) {
    output.add("Amazon");
  }
  if (
    ipInRange(packet, "52.119.128-255.0-255") ||
    ipInRange(packet, "52.218.204.0/24") ||
    ipInRange(packet, "52.84-95.0-255.0-255") ||
    ipInRange(packet, "54.240-255.0-255.0-255")
  ) {
    output.add("Amazon");
  }
  if (hostContains(packet, "cloudfront")) {
    output.add("Cloudflare");
  }
  if (hostContains(packet, "spotify")) {
    output.add("Spotify");
  }
  if (hostContains(packet, "github") || ipInRange(packet, "185.199.109.154")) {
    output.add("Github");
    output.add("Microsoft");
  }
  if (hostContains(packet, "skype")) {
    output.add("Skype");
    output.add("Microsoft");
  }
  if (hostContains(packet, "azure") || hostContains(packet, "trafficmanager")) {
    output.add("Microsoft");
  }
  if (hostContains(packet, "paypal")) {
    output.add("Paypal");
  }
  if (hostContains(packet, "whatsapp")) {
    output.add("Whatsapp");
    output.add("Facebook");
  }
  if (hostContains(packet, "adguard")) {
    output.add("AdGuard");
  }
  if (hostContains(packet, "fbc") || hostContains(packet, "facebook")) {
    output.add("Facebook");
  }
  if (
    hostContains(packet, "slack") ||
    hostContains(packet, "ec2-3-120-198-117")
  ) {
    output.add("Slack");
    output.add("Amazon");
  }
  if (hostContains(packet, "zoho") || ipInRange(packet, "204.141.42.0/24")) {
    output.add("Zoho");
  }
  return [...output];
};
