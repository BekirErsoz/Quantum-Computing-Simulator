module Simulator

using ..QuantumTypes
using ..Gates
using LinearAlgebra
using Random
using SparseArrays

struct QuantumCircuit
    num_qubits::Int
    gates::Vector{QuantumGate}

    QuantumCircuit(num_qubits::Int) = new(num_qubits, QuantumGate[])
end

# Kapı ekleme fonksiyonları
function add_gate!(circuit::QuantumCircuit, gate::QuantumGate)
    push!(circuit.gates, gate)
end

function H!(circuit::QuantumCircuit, qubit::Int)
    gate = SingleQubitGate(Gates.Hadamard, qubit, "H")
    add_gate!(circuit, gate)
end

function X!(circuit::QuantumCircuit, qubit::Int)
    gate = SingleQubitGate(Gates.PauliX, qubit, "X")
    add_gate!(circuit, gate)
end

function CNOT!(circuit::QuantumCircuit, control::Int, target::Int)
    gate = TwoQubitGate(Gates.CNOT, control, target, "CNOT")
    add_gate!(circuit, gate)
end

# Kapı uygulama
function apply_gate(state::QuantumState, gate::SingleQubitGate)
    n = state.num_qubits
    new_amplitudes = copy(state.amplitudes)

    # Her basis state için
    for i in 0:2^n-1
        # Target qubit'in değerini kontrol et
        if i & (1 << (gate.target_qubit - 1)) == 0
            # |0⟩ durumu
            j = i | (1 << (gate.target_qubit - 1))  # |1⟩ durumunun indeksi

            amp0 = state.amplitudes[i + 1]
            amp1 = state.amplitudes[j + 1]

            # Kapı matrisini uygula
            new_amplitudes[i + 1] = gate.matrix[1,1] * amp0 + gate.matrix[1,2] * amp1
            new_amplitudes[j + 1] = gate.matrix[2,1] * amp0 + gate.matrix[2,2] * amp1
        end
    end

    return QuantumState(new_amplitudes)
end

function apply_gate(state::QuantumState, gate::TwoQubitGate)
    n = state.num_qubits
    new_amplitudes = copy(state.amplitudes)

    for i in 0:2^n-1
        c_bit = (i >> (gate.control_qubit - 1)) & 1
        t_bit = (i >> (gate.target_qubit - 1)) & 1

        if c_bit == 1 && t_bit == 0
            # CNOT flip target
            j = i ⊻ (1 << (gate.target_qubit - 1))
            new_amplitudes[i + 1] = state.amplitudes[j + 1]
            new_amplitudes[j + 1] = state.amplitudes[i + 1]
        end
    end

    return QuantumState(new_amplitudes)
end

# Devre simülasyonu
function simulate(circuit::QuantumCircuit, initial_state::QuantumState=QuantumState(circuit.num_qubits))
    state = initial_state

    for gate in circuit.gates
        state = apply_gate(state, gate)
    end

    return state
end

# Ölçüm
function measure(state::QuantumState, qubit::Int)
    probabilities = abs2.(state.amplitudes)

    # Qubit'in |0⟩ olma olasılığı
    prob_0 = 0.0
    for i in 0:2^state.num_qubits-1
        if (i >> (qubit - 1)) & 1 == 0
            prob_0 += probabilities[i + 1]
        end
    end

    # Ölçüm sonucu
    outcome = rand() < prob_0 ? 0 : 1

    # Dalga fonksiyonu çökmesi
    new_amplitudes = zeros(ComplexF64, length(state.amplitudes))
    norm_factor = outcome == 0 ? sqrt(prob_0) : sqrt(1 - prob_0)

    for i in 0:2^state.num_qubits-1
        if ((i >> (qubit - 1)) & 1) == outcome
            new_amplitudes[i + 1] = state.amplitudes[i + 1] / norm_factor
        end
    end

    collapsed_state = QuantumState(new_amplitudes)
    probability = outcome == 0 ? prob_0 : 1 - prob_0

    return MeasurementResult(outcome, probability, collapsed_state)
end

# Çoklu ölçüm
function measure_all(state::QuantumState, shots::Int=1000)
    probabilities = abs2.(state.amplitudes)
    outcomes = Dict{String, Int}()

    for _ in 1:shots
        # Olasılığa göre bir outcome seç
        r = rand()
        cumsum = 0.0
        outcome = 0

        for (i, p) in enumerate(probabilities)
            cumsum += p
            if r < cumsum
                outcome = i - 1
                break
            end
        end

        # Binary string olarak kaydet
        key = string(outcome, base=2, pad=state.num_qubits)
        outcomes[key] = get(outcomes, key, 0) + 1
    end

    return outcomes
end

end # module
