from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import julia
from julia import Main
import json
import base64

app = Flask(__name__)
CORS(app)

# Julia bridge
Main.include("../quantum-core/src/QuantumTypes.jl")
Main.include("../quantum-core/src/Simulator.jl")

class QuantumCircuitBuilder:
    def __init__(self, num_qubits):
        self.num_qubits = num_qubits
        self.gates = []

    def h(self, qubit):
        """Hadamard gate"""
        self.gates.append({
            'type': 'H',
            'qubits': [qubit],
            'matrix': [[1/np.sqrt(2), 1/np.sqrt(2)], 
                      [1/np.sqrt(2), -1/np.sqrt(2)]]
        })
        return self

    def x(self, qubit):
        """Pauli-X gate"""
        self.gates.append({
            'type': 'X',
            'qubits': [qubit],
            'matrix': [[0, 1], [1, 0]]
        })
        return self

    def cnot(self, control, target):
        """CNOT gate"""
        self.gates.append({
            'type': 'CNOT',
            'qubits': [control, target],
            'matrix': [[1,0,0,0], [0,1,0,0], [0,0,0,1], [0,0,1,0]]
        })
        return self

    def rx(self, qubit, theta):
        """Rotation around X axis"""
        cos = np.cos(theta/2)
        sin = np.sin(theta/2)
        self.gates.append({
            'type': 'RX',
            'qubits': [qubit],
            'angle': theta,
            'matrix': [[cos, -1j*sin], [-1j*sin, cos]]
        })
        return self

    def measure(self, qubit=None):
        """Measurement"""
        if qubit is None:
            qubits = list(range(self.num_qubits))
        else:
            qubits = [qubit] if isinstance(qubit, int) else qubit

        self.gates.append({
            'type': 'MEASURE',
            'qubits': qubits
        })
        return self

    def to_json(self):
        return {
            'num_qubits': self.num_qubits,
            'gates': self.gates
        }

# Quantum algorithms implementation
class QuantumAlgorithms:
    @staticmethod
    def create_bell_state():
        """Create Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2"""
        circuit = QuantumCircuitBuilder(2)
        circuit.h(0).cnot(0, 1)
        return circuit

    @staticmethod
    def quantum_teleportation():
        """Quantum teleportation protocol"""
        circuit = QuantumCircuitBuilder(3)
        # Create entangled pair
        circuit.h(1).cnot(1, 2)
        # Alice's operations
        circuit.cnot(0, 1).h(0)
        # Measurements and corrections would be handled separately
        return circuit

    @staticmethod
    def grover_oracle(circuit, marked_states):
        """Grover oracle for marked states"""
        n = circuit.num_qubits
        for state in marked_states:
            # Mark the state with phase flip
            # Simplified version - real implementation would be more complex
            controls = []
            for i in range(n):
                if (state >> i) & 1:
                    controls.append(i)
            # Multi-controlled Z gate
            if len(controls) == 2:
                circuit.cz(controls[0], controls[1])
        return circuit

    @staticmethod
    def shor_algorithm(N, a=None):
        """Shor's algorithm for factoring"""
        # Find number of qubits needed
        n = int(np.ceil(np.log2(N)))
        m = 2 * n

        circuit = QuantumCircuitBuilder(m + n)

        # Initialize
        for i in range(m):
            circuit.h(i)

        # Modular exponentiation (simplified)
        # Real implementation would require quantum arithmetic

        # QFT
        QuantumAlgorithms.qft(circuit, list(range(m)))

        return circuit

    @staticmethod
    def qft(circuit, qubits):
        """Quantum Fourier Transform"""
        n = len(qubits)
        for j in range(n):
            circuit.h(qubits[j])
            for k in range(j+1, n):
                angle = 2*np.pi / (2**(k-j+1))
                circuit.controlled_phase(qubits[k], qubits[j], angle)

        # Swap qubits
        for i in range(n//2):
            circuit.swap(qubits[i], qubits[n-1-i])

        return circuit

# API Endpoints
@app.route('/api/circuit/create', methods=['POST'])
def create_circuit():
    data = request.json
    num_qubits = data.get('num_qubits', 2)

    circuit = QuantumCircuitBuilder(num_qubits)
    circuit_id = str(uuid.uuid4())

    # Store circuit in session or database
    circuits[circuit_id] = circuit

    return jsonify({
        'circuit_id': circuit_id,
        'num_qubits': num_qubits
    })

@app.route('/api/circuit/<circuit_id>/gate', methods=['POST'])
def add_gate_endpoint(circuit_id):
    data = request.json
    gate_type = data['type']
    qubits = data.get('qubits', [])
    params = data.get('params', {})

    circuit = circuits.get(circuit_id)
    if not circuit:
        return jsonify({'error': 'Circuit not found'}), 404

    # Add gate based on type
    if gate_type == 'H':
        circuit.h(qubits[0])
    elif gate_type == 'X':
        circuit.x(qubits[0])
    elif gate_type == 'CNOT':
        circuit.cnot(qubits[0], qubits[1])
    elif gate_type == 'RX':
        circuit.rx(qubits[0], params['theta'])

    return jsonify({'success': True})

@app.route('/api/circuit/<circuit_id>/simulate', methods=['POST'])
def simulate_circuit(circuit_id):
    circuit = circuits.get(circuit_id)
    if not circuit:
        return jsonify({'error': 'Circuit not found'}), 404

    shots = request.json.get('shots', 1000)

    # Call Julia simulator
    # For simplicity, returning placeholder
    result = {
        'measurements': {},
        'state_vector': [],
        'probabilities': {}
    }

    return jsonify({
        'measurements': result['measurements'],
        'state_vector': result['state_vector'],
        'probabilities': result['probabilities']
    })

@app.route('/api/algorithms/bell-state', methods=['GET'])
def create_bell_state_api():
    circuit = QuantumAlgorithms.create_bell_state()
    # Placeholder result
    result = {'measurements': {}, 'state_vector': [], 'probabilities': {}}

    return jsonify({
        'circuit': circuit.to_json(),
        'result': result
    })

@app.route('/api/algorithms/grover', methods=['POST'])
def grover_search_endpoint():
    data = request.json
    n = data.get('num_qubits', 3)
    marked = data.get('marked_states', [5])  # Default: search for |101⟩

    circuit = QuantumCircuitBuilder(n)

    # Initialize superposition
    for i in range(n):
        circuit.h(i)

    # Grover iterations
    iterations = int(np.pi/4 * np.sqrt(2**n))
    for _ in range(iterations):
        # Oracle placeholder
        pass

    result = {'measurements': {}, 'state_vector': [], 'probabilities': {}}

    return jsonify({
        'circuit': circuit.to_json(),
        'iterations': iterations,
        'result': result
    })

if __name__ == '__main__':
    circuits = {}  # In-memory storage
    app.run(debug=True, port=5001)
