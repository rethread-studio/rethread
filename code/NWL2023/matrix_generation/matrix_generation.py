import numpy as np
import json

N = 4
upperBound = 100

def randomMatrix():
    return upperBound*np.random.rand(N, N)

def randomIntMatrix():
    return np.random.randint(upperBound, size=(N, N))

def randomInvertibleMatrix(integer = False):
    m = randomIntMatrix() if integer else randomMatrix()
    if np.linalg.det(m) != 0:
        return m
    return randomInvertibleMatrix()

"""
def generateInvertibleMatrices(k = 100, filename = "matrices.txt"):
    # k: number of matrices to generate
    myFile = open(filename, 'w')
    for i in range(k):
        m = randomInvertibleMatrix(True)
        myFile.write(np.array2string(m) + "\n")
    myFile.close()
"""

def generateInvertibleMatrices(k = 100, filename = "matrices.json"):
    # k: number of matrices to generate
    matrices = [randomInvertibleMatrix(True).tolist() for i in range(k)]
    with open(filename, 'w') as f:
        json.dump({"matrices":matrices}, f)

#m = randomInvertibleMatrix(integer = True)
#print(m)
#print("det =",np.linalg.det(m))
generateInvertibleMatrices()