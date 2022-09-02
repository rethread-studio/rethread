package se.kth.castor.tracer;

public class Method {
    String fqn;
    String supplier;
    String dependency;

    public Method(String fqn) {
        this.fqn = fqn;
        String[] splitFQN = fqn.split("\\.");
        this.supplier = splitFQN[0] + "." + splitFQN[1];
        this.dependency = splitFQN[2]; // an approximation
    }

    public String getFqn() {
        return fqn;
    }

    public void setFqn(String fqn) {
        this.fqn = fqn;
    }

    public String getSupplier() {
        return supplier;
    }

    public void setSupplier(String supplier) {
        this.supplier = supplier;
    }

    public String getDependency() {
        return dependency;
    }

    public void setDependency(String dependency) {
        this.dependency = dependency;
    }
}
