package se.kth.castor.tracer;


import java.time.Instant;

public class NobelElement {
    // called method
    Method callee;
    // parent method
    Method caller;
    // size of stack trace
    int length;
    String stackTrace;
    long timestamp;

    public NobelElement(StackTraceElement element,
                        StackTraceElement parentElement,
                        String stackTrace,
                        int stackLength) {
        this.callee = new Method(element.getClassName() + "." + element.getMethodName());
        this.caller = new Method(parentElement.getClassName() + "." + parentElement.getMethodName());
        this.length = stackLength;
        this.stackTrace = stackTrace;
        timestamp = Instant.now().toEpochMilli();
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public Method getCallee() {
        return callee;
    }

    public void setCallee(Method callee) {
        this.callee = callee;
    }

    public Method getCaller() {
        return caller;
    }

    public void setCaller(Method caller) {
        this.caller = caller;
    }

    public String getStackTrace() {
        return stackTrace;
    }

    public void setStackTrace(String stackTrace) {
        this.stackTrace = stackTrace;
    }

    public int getLength() {
        return length;
    }

    public void setLength(int length) {
        this.length = length;
    }
}
