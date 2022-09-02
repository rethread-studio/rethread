## nobel-tracer

This project prepares a tracer. The goal of the tracer is to monitor methods as they get invoked during the execution of a project, and save some data about these invocations.

**Prerequisites**
- Java 11+
- Download and extract [Glowroot](https://glowroot.org/)
- Create a `plugins` folder under `glowroot/`

**Using the tracer**
- `cd nobel-tracer/` 
- Build with `mvn clean install`
- Drop `nobel-tracer/target/nobel-tracer-1.0-jar-with-dependencies.jar` in `glowroot/plugins/`
- Run the application / project you want to trace, as you normally would, but with `glowroot` as `javaagent`
  - Example: `java -javaagent:/path/to/glowroot/glowroot.jar some-project-to-trace.jar`
- The resulting data is stored in `<system-temp-directory>/nobel-tracing-data/data-<timestamp>.json`
