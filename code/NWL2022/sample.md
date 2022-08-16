### Sample dataset

A sample JSON dataset for method calls occuring during execution can be found [here](https://kth-my.sharepoint.com/:u:/g/personal/deepikat_ug_kth_se/EXDt-aFckBdDiDBmGG34MKgBtgveYPQRVYNyrXLwk20d1A?e=joqta1). The data is of the following format:
```
[{
  "callee" : {
    "fqn" : "org.apache.pdfbox.tools.Encrypt.main",
    "supplier" : "org.apache",
    "dependency" : "pdfbox"
  },
  "caller" : {
    "fqn" : "org.apache.pdfbox.tools.PDFBox.main",
    "supplier" : "org.apache",
    "dependency" : "pdfbox"
  },
  "timestamp" : 1660074643479
}, ...]
```

### What's included
- Each element in this array represents one method call
- The `callee` is the method that is invoked by the `caller`
  - In the example above, the method `main` in the class `org.apache.pdfbox.tools.PDFBox` calls the method `main` in `org.apache.pdfbox.tools.Encrypt`
- For the caller and the callee, we include the
  - `fqn`: the fully qualified name of the method
  - `supplier`: the organisation that owns the project
  - `dependency`: the library/project where the method is defined
  - Note that the `dependency` is an approximation and may sometimes be incorrect
- Additionally, as a proxy of the sequence of method calls, we assign a `timestamp` to each method call
