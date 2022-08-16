#
# Build stage
#
FROM maven:3.6.0-jdk-8-slim AS build
COPY src /home/app/src
COPY pom.xml /home/app
RUN mvn -f /home/app/pom.xml clean package

#
# Execution stage
#
FROM openjdk:8-jre-slim
COPY --from=build /home/app/target/minvert-1.0-jar-with-dependencies.jar /usr/local/lib/app.jar
ENTRYPOINT ["java","-jar","/usr/local/lib/app.jar"]
# Run the container indefinitely
ENTRYPOINT ["tail", "-f", "/dev/null"]