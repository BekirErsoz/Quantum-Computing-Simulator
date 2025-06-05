module QuantumTypes

using LinearAlgebra
using SparseArrays

# Kuantum durumu (state vector)
struct QuantumState
    amplitudes::Vector{ComplexF64}
    num_qubits::Int

    function QuantumState(num_qubits::Int)
        # |00...0⟩ başlangıç durumu
        amplitudes = zeros(ComplexF64, 2^num_qubits)
        amplitudes[1] = 1.0
        new(amplitudes, num_qubits)
    end

    function QuantumState(amplitudes::Vector{ComplexF64})
        num_qubits = Int(log2(length(amplitudes)))
        new(normalize(amplitudes), num_qubits)
    end
end

# Kuantum kapısı
abstract type QuantumGate end

struct SingleQubitGate <: QuantumGate
    matrix::Matrix{ComplexF64}
    target_qubit::Int
    name::String
end

struct TwoQubitGate <: QuantumGate
    matrix::Matrix{ComplexF64}
    control_qubit::Int
    target_qubit::Int
    name::String
end

struct MultiQubitGate <: QuantumGate
    matrix::Matrix{ComplexF64}
    qubits::Vector{Int}
    name::String
end

# Ölçüm sonucu
struct MeasurementResult
    outcome::Int
    probability::Float64
    collapsed_state::QuantumState
end

end # module
