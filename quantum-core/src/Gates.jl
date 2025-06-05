module Gates

using ..QuantumTypes
using LinearAlgebra

# Pauli kapıları
const PauliX = [0 1; 1 0] |> ComplexF64
const PauliY = [0 -im; im 0] |> ComplexF64
const PauliZ = [1 0; 0 -1] |> ComplexF64

# Hadamard kapısı
const Hadamard = [1 1; 1 -1] / √2 |> ComplexF64

# Phase kapıları
S_gate() = [1 0; 0 im] |> ComplexF64
T_gate() = [1 0; 0 exp(im*π/4)] |> ComplexF64

# Rotation kapıları
function RX(θ::Real)
    [cos(θ/2) -im*sin(θ/2); -im*sin(θ/2) cos(θ/2)] |> ComplexF64
end

function RY(θ::Real)
    [cos(θ/2) -sin(θ/2); sin(θ/2) cos(θ/2)] |> ComplexF64
end

function RZ(θ::Real)
    [exp(-im*θ/2) 0; 0 exp(im*θ/2)] |> ComplexF64
end

# CNOT kapısı
const CNOT = [
    1 0 0 0;
    0 1 0 0;
    0 0 0 1;
    0 0 1 0
] |> ComplexF64

# Toffoli (CCNOT) kapısı
const Toffoli = [
    1 0 0 0 0 0 0 0;
    0 1 0 0 0 0 0 0;
    0 0 1 0 0 0 0 0;
    0 0 0 1 0 0 0 0;
    0 0 0 0 1 0 0 0;
    0 0 0 0 0 1 0 0;
    0 0 0 0 0 0 0 1;
    0 0 0 0 0 0 1 0
] |> ComplexF64

# Kontrollü kapı oluştur
function controlled_gate(gate::Matrix{ComplexF64})
    n = size(gate, 1)
    controlled = Matrix{ComplexF64}(I, 2n, 2n)
    controlled[n+1:end, n+1:end] = gate
    return controlled
end

# Arbitrary single-qubit gate
function U3(θ::Real, φ::Real, λ::Real)
    [
        cos(θ/2)                    -exp(im*λ)*sin(θ/2);
        exp(im*φ)*sin(θ/2)          exp(im*(φ+λ))*cos(θ/2)
    ] |> ComplexF64
end

end # module
