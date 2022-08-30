#!/bin/bash

export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.0.3.jdk
source ~/.zshrc

# Java version
java --version

# Execute VARNAv3 jar file
echo "Running VARNAv3... "
java -jar VARNAv3-93.jar

# Execute VARNAv3 jar file with javacg-0.1-SNAPSHOT-dycg-agent.jar
echo "Running VARNAv3 with javaagent... "
java -javaagent:javacg-0.1-SNAPSHOT-dycg-agent.jar="incl=fr.orsay.lri.varna.*;excl=org.*" -cp javacg-0.1-SNAPSHOT-dycg-agent.jar:VARNAv3-93.jar -jar VARNAv3-93.jar > methods-call.txt
