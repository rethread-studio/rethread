package se.kth.castor.minvert.runner;

import java.util.Random;

import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.inverse.InvertMatrix;

public class Matrixer {

  /**
   * Generates a 42 x 42 matrix with random integers
   *
   * @return matrix
   */
  public static int[][] generateRandomMatrix() {
    Random r = new Random();
    int[][] randomMatrix = new int[42][42];
    for (int i = 0; i < 42; i++) {
      for (int j = 0; j < 42; j++) {
        randomMatrix[i][j] = r.nextInt(43);
      }
    }
    return randomMatrix;
  }

  public void doStuff() {
    INDArray original = Nd4j.create(Matrixer.generateRandomMatrix());
    INDArray inverted = InvertMatrix.invert(original, true);
    System.out.println(inverted.length());
  }

  public static void main(String[] args) {
    Matrixer matrixer = new Matrixer();
    matrixer.doStuff();
  }

  public static void printMatrix(int[][] matrix) {
    for (int i = 0; i < matrix.length; i++) {
      for (int j = 0; j < matrix[i].length; j++) {
        System.out.print(matrix[i][j] + " ");
      }
      System.out.println();
    }
  }
}
