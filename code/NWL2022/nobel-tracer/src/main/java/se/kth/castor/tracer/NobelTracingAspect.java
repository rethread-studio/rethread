package se.kth.castor.tracer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.glowroot.agent.plugin.api.Logger;
import org.glowroot.agent.plugin.api.weaving.*;

import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public class NobelTracingAspect {
    /**
     * Add / modify classes that are to be instrumented with CLASSES_TO_INSTRUMENT
     * <p>
     * More info here on how to define a Pointcut with Glowroot:
     * https://glowroot.org/javadoc/agent-plugin-api/0.13.6/index.html?help-doc.html
     * <p>
     * More examples on instrumentation with Glowroot here:
     * https://github.com/glowroot/glowroot/tree/main/agent/plugins
     */
    static final String CLASSES_TO_INSTRUMENT = "org.*"
            + "|javax.^management"
            + "|java.awt.*"
            + "|java.util.^jar"
            + "|fr.*"
            + "|sun.java2d.*"
            + "|sun.awt.*"
            + "|java.lang.^reflect"
            + "|java.io.^File*"
            + "|com.sun.^jmx"
            + "|com.^fasterxml";

    static final long timeStamp = Instant.now().toEpochMilli();

    @Pointcut(className = CLASSES_TO_INSTRUMENT,
            methodName = "*",
            methodParameterTypes = {"*"},
            methodModifiers = {MethodModifier.PUBLIC},
            timerName = "Timer")
    public static class Tracer {
        private static StackTraceElement stackTraceElement;
        private static StackTraceElement stackTraceElementParent;
        private static String stackTrace;
        private static int stackLength;
        private static final Logger logger = Logger.getLogger(NobelTracingAspect.class);
        private static File tracingDataFile;

        private static void setup() {
            try {
                String tempDir = System.getProperty("java.io.tmpdir");
                String storageDir = tempDir + "/nobel-tracing-data/";
                Files.createDirectories(Paths.get(storageDir));
                String filePath = storageDir + "data-" + timeStamp + ".json";
                tracingDataFile = new File(filePath);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        private static void appendElementToFile(String elementAsJSON) throws Exception {
            FileWriter objectFileWriter = new FileWriter(tracingDataFile, true);
            objectFileWriter.write(elementAsJSON + ",\n");
            objectFileWriter.close();
        }

        @IsEnabled
        public static boolean isEnabled() {
            setup();
            StackTraceElement[] traceElements = Thread.currentThread().getStackTrace();
            if (traceElements.length <= 3)
                return false;
            else if (traceElements[2].getClassName().contains("glowroot"))
                return false;
            stackTraceElement = traceElements[2];
            stackTraceElementParent = traceElements[3];
            stackTrace = Arrays.toString(Arrays.stream(traceElements).skip(2).toArray());
            stackLength = traceElements.length - 2; // exclude monitoring methods
            // if only tracing copy-paste
            // return isCopyPasteAction();
            return true;
        }

        public static boolean methodOrClassNameContainsString(StackTraceElement element, String toFind) {
            return element.getMethodName().toLowerCase(Locale.ROOT).contains(toFind) ||
                    element.getClassName().toLowerCase(Locale.ROOT).contains(toFind);
        }

        public static boolean isCopyPasteAction() {
            List<String> words = List.of("clipboard", "paste");
            boolean containsRequiredWord = false;
            boolean containsUnrequiredWord = true;
            for (String word : words) {
                if (methodOrClassNameContainsString(stackTraceElement, word) ||
                        methodOrClassNameContainsString(stackTraceElementParent, word)) {
                    containsRequiredWord = true;
                    break;
                }
            }
            List<String> ignoreWords = List.of("copyimage", "copyiterator");
            for (String word : ignoreWords) {
                if (!methodOrClassNameContainsString(stackTraceElement, word) &
                        !methodOrClassNameContainsString(stackTraceElementParent, word)) {
                    containsUnrequiredWord = false;
                    break;
                }
            }
            return containsRequiredWord & !containsUnrequiredWord;
        }

        public static void prepareElementJSON() throws Exception {
            NobelElement thisElement = new NobelElement(stackTraceElement,
                    stackTraceElementParent, stackTrace, stackLength);
            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
            String preparedJSON = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(thisElement);
            appendElementToFile(preparedJSON);
        }

        @OnBefore
        public static void onBefore() {
            try {
                prepareElementJSON();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
