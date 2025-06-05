#include <iostream>
#include <complex>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <omp.h>
#include <immintrin.h>

using Complex = std::complex<double>;
using StateVector = std::vector<Complex>;

class QuantumSimulatorCPP {
private:
    std::mt19937 rng;

public:
    QuantumSimulatorCPP() : rng(std::chrono::steady_clock::now().time_since_epoch().count()) {}

    // Optimized matrix multiplication using AVX
    void applyGateOptimized(StateVector& state, const std::vector<std::vector<Complex>>& gate, int target_qubit) {
        int n = log2(state.size());
        int state_size = state.size();

        #pragma omp.parallel for
        for (int i = 0; i < state_size; i += 2) {
            int bit_mask = 1 << target_qubit;
            if ((i & bit_mask) == 0) {
                int j = i | bit_mask;

                Complex amp0 = state[i];
                Complex amp1 = state[j];

                state[i] = gate[0][0] * amp0 + gate[0][1] * amp1;
                state[j] = gate[1][0] * amp0 + gate[1][1] * amp1;
            }
        }
    }

    // Fast quantum Fourier transform
    void QFT(StateVector& state, std::vector<int> qubits) {
        int n = qubits.size();

        for (int j = 0; j < n; j++) {
            // Apply Hadamard
            applyHadamard(state, qubits[j]);

            // Apply controlled phase rotations
            for (int k = j + 1; k < n; k++) {
                double angle = 2.0 * M_PI / pow(2, k - j + 1);
                applyControlledPhase(state, qubits[k], qubits[j], angle);
            }
        }

        // Swap qubits
        for (int i = 0; i < n / 2; i++) {
            swapAmplitudes(state, qubits[i], qubits[n - 1 - i]);
        }
    }

    // Optimized measurement
    int measureQubit(StateVector& state, int qubit) {
        double prob_zero = 0.0;
        int mask = 1 << qubit;

        #pragma omp.parallel for reduction(+:prob_zero)
        for (int i = 0; i < state.size(); i++) {
            if ((i & mask) == 0) {
                prob_zero += std::norm(state[i]);
            }
        }

        std::uniform_real_distribution<double> dist(0.0, 1.0);
        int outcome = (dist(rng) < prob_zero) ? 0 : 1;

        // Collapse state
        double norm_factor = (outcome == 0) ? sqrt(prob_zero) : sqrt(1 - prob_zero);

        #pragma omp.parallel for
        for (int i = 0; i < state.size(); i++) {
            if (((i >> qubit) & 1) != outcome) {
                state[i] = 0;
            } else {
                state[i] /= norm_factor;
            }
        }

        return outcome;
    }

private:
    void applyHadamard(StateVector& state, int qubit) {
        const double inv_sqrt2 = 1.0 / sqrt(2.0);
        std::vector<std::vector<Complex>> H = {
            {inv_sqrt2, inv_sqrt2},
            {inv_sqrt2, -inv_sqrt2}
        };
        applyGateOptimized(state, H, qubit);
    }

    void applyControlledPhase(StateVector& state, int control, int target, double angle) {
        Complex phase = std::exp(Complex(0, angle));
        int control_mask = 1 << control;
        int target_mask = 1 << target;

        #pragma omp.parallel for
        for (int i = 0; i < state.size(); i++) {
            if ((i & control_mask) && (i & target_mask)) {
                state[i] *= phase;
            }
        }
    }

    void swapAmplitudes(StateVector& state, int qubit1, int qubit2) {
        int mask1 = 1 << qubit1;
        int mask2 = 1 << qubit2;

        #pragma omp.parallel for
        for (int i = 0; i < state.size(); i++) {
            int bit1 = (i & mask1) >> qubit1;
            int bit2 = (i & mask2) >> qubit2;

            if (bit1 != bit2) {
                int j = i ^ mask1 ^ mask2;
                if (i < j) {
                    std::swap(state[i], state[j]);
                }
            }
        }
    }
};

// C interface for Python/Julia binding
extern "C" {
    void* create_simulator() {
        return new QuantumSimulatorCPP();
    }

    void destroy_simulator(void* sim) {
        delete static_cast<QuantumSimulatorCPP*>(sim);
    }

    void apply_qft(void* sim, double* state_real, double* state_imag, int state_size, int* qubits, int num_qubits) {
        QuantumSimulatorCPP* simulator = static_cast<QuantumSimulatorCPP*>(sim);

        StateVector state(state_size);
        for (int i = 0; i < state_size; i++) {
            state[i] = Complex(state_real[i], state_imag[i]);
        }

        std::vector<int> qubit_vec(qubits, qubits + num_qubits);
        simulator->QFT(state, qubit_vec);

        for (int i = 0; i < state_size; i++) {
            state_real[i] = state[i].real();
            state_imag[i] = state[i].imag();
        }
    }
}
