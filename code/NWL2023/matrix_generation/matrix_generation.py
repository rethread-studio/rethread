import numpy as np
import json

N = 32

def randomMatrix():
    return np.random.rand(N, N)

def diagonalMatrix():
    return np.diag(np.random.rand(N))

def lowerTriangularMatrix():
    return np.triu(randomMatrix())

def upperTriangularMatrix():
    return np.tril(randomMatrix())

def vandermondeMatrix():
    return np.vander(np.random.rand(N))

def invertibleMatrix(typeOfMatrix):
    switch = {
        "random": randomMatrix(),
        "diagonal": diagonalMatrix(),
        "lower triangular": lowerTriangularMatrix(),
        "upper triangular": upperTriangularMatrix(),
        "vandermonde": vandermondeMatrix()
    }
    m = switch.get(typeOfMatrix)
    if np.linalg.det(m) != 0:
        return m
    return invertibleMatrix(typeOfMatrix)

def generateInvertibleMatrices(k = 100, filename = "matrices.json"):
    # k: number of matrices to generate per type of matrix
    types = ["random", "diagonal", "lower triangular", "upper triangular", "vandermonde"]
    matrices = {}
    for t in types:
        matrices[t] = [invertibleMatrix(t).tolist() for i in range(k)]
    with open(filename, 'w') as f:
        json.dump(matrices, f, indent=1)

generateInvertibleMatrices()