#include "WebServerVis.h"

std::unordered_map<std::string, size_t> WebServerVis::node_action_map{
    {"async after RANDOMBYTESREQUEST", 0},
    {"async after Immediate", 1},
    {"async after TCPCONNECTWRAP", 2},
    {"async after TCPWRAP", 3},
    {"async after Timeout", 4},
    {"async after FILEHANDLECLOSEREQ", 5},
    {"promiseResolve PROMISE", 6},
    {"async after FSREQCALLBACK", 7},
    {"async after HTTPINCOMINGMESSAGE", 8},
    {"async after GETADDRINFOREQWRAP", 9},
    {"async after FSREQPROMISE", 10},
    {"async after ZLIB", 11},
    {"async after SHUTDOWNWRAP", 12}
};
