import React, { useState, useEffect, useRef } from 'react';
import { QuantumVisualizer } from '../visualization/src/QuantumVisualizer';
import './App.css';

interface CircuitGate {
  type: string;
  qubits: number[];
  params?: any;
}

function App() {
  const [numQubits, setNumQubits] = useState(3);
  const [gates, setGates] = useState<CircuitGate[]>([]);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('custom');
  const visualizerRef = useRef<HTMLDivElement>(null);
  const quantumVis = useRef<QuantumVisualizer | null>(null);

  useEffect(() => {
    if (visualizerRef.current && !quantumVis.current) {
      quantumVis.current = new QuantumVisualizer(visualizerRef.current);
    }
  }, []);

  const addGate = (type: string, ...qubits: number[]) => {
    const newGate: CircuitGate = { type, qubits };
    setGates([...gates, newGate]);

    if (quantumVis.current) {
      quantumVis.current.visualizeCircuit([...gates, newGate]);
    }
  };

  const runSimulation = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/circuit/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_qubits: numQubits,
          gates: gates,
          shots: 1000
        })
      });

      const result = await response.json();
      setSimulationResult(result);

      if (quantumVis.current && result.state_vector) {
        quantumVis.current.visualizeQuantumState({
          amplitudes: result.state_vector,
          numQubits: numQubits
        });
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
  };

  const loadAlgorithm = async (algorithm: string) => {
    setSelectedAlgorithm(algorithm);

    switch (algorithm) {
      case 'bell':
        setNumQubits(2);
        setGates([
          { type: 'H', qubits: [0] },
          { type: 'CNOT', qubits: [0, 1] }
        ]);
        break;

      case 'grover':
        setNumQubits(3);
        // Grover's algorithm gates would be loaded here
        break;

      case 'teleportation':
        setNumQubits(3);
        setGates([
          { type: 'H', qubits: [1] },
          { type: 'CNOT', qubits: [1, 2] },
          { type: 'CNOT', qubits: [0, 1] },
          { type: 'H', qubits: [0] }
        ]);
        break;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔬 Quantum Circuit Simulator</h1>
      </header>

      <div className="main-container">
        <div className="control-panel">
          <div className="section">
            <h3>Circuit Setup</h3>
            <label>
              Number of Qubits:
              <input
                type="number"
                value={numQubits}
                onChange={(e) => setNumQubits(parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </label>
          </div>

          <div className="section">
            <h3>Quantum Algorithms</h3>
            <select 
              value={selectedAlgorithm} 
              onChange={(e) => loadAlgorithm(e.target.value)}
            >
              <option value="custom">Custom Circuit</option>
              <option value="bell">Bell State</option>
              <option value="grover">Grover's Search</option>
              <option value="teleportation">Quantum Teleportation</option>
              <option value="qft">Quantum Fourier Transform</option>
              <option value="shor">Shor's Algorithm</option>
            </select>
          </div>

          <div className="section">
            <h3>Add Gates</h3>
            <div className="gate-buttons">
              {Array.from({ length: numQubits }, (_, i) => (
                <div key={i} className="qubit-gates">
                  <span>Q{i}:</span>
                  <button onClick={() => addGate('H', i)}>H</button>
                  <button onClick={() => addGate('X', i)}>X</button>
                  <button onClick={() => addGate('Y', i)}>Y</button>
                  <button onClick={() => addGate('Z', i)}>Z</button>
                </div>
              ))}

              {numQubits >= 2 && (
                <div className="two-qubit-gates">
                  <h4>Two-Qubit Gates</h4>
                  <button onClick={() => addGate('CNOT', 0, 1)}>CNOT(0,1)</button>
                  <button onClick={() => addGate('SWAP', 0, 1)}>SWAP(0,1)</button>
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <h3>Circuit</h3>
            <div className="circuit-display">
              {gates.map((gate, index) => (
                <div key={index} className="gate-item">
                  {gate.type}({gate.qubits.join(',')})
                  <button onClick={() => {
                    setGates(gates.filter((_, i) => i !== index));
                  }}>×</button>
                </div>
              ))}
            </div>

            <button className="simulate-btn" onClick={runSimulation}>
              Run Simulation
            </button>
            <button className="clear-btn" onClick={() => setGates([])}>
              Clear Circuit
            </button>
          </div>

          {simulationResult && (
            <div className="section results">
              <h3>Results</h3>
              <div className="measurement-results">
                {Object.entries(simulationResult.measurements || {}).map(([state, count]) => (
                  <div key={state} className="measurement-bar">
                    <span>{state}:</span>
                    <div className="bar">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${(count as number) / 10}%` }}
                      />
                    </div>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="visualizer" ref={visualizerRef} />
      </div>
    </div>
  );
}

export default App;
