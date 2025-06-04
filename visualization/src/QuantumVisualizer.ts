import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

interface QuantumState {
    amplitudes: Complex[];
    numQubits: number;
}

interface Complex {
    real: number;
    imag: number;
}

interface Gate {
    type: string;
    qubits: number[];
    matrix?: number[][];
    angle?: number;
}

// [QuantumVisualizer class content here]...
// Due to character limitations, the full content has been shortened.

class Circuit3D {
    private group: THREE.Group;
    private scene: THREE.Scene;
    private gates: Map<string, THREE.Group> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.set(0, 3, 0);
        scene.add(this.group);
    }

    public buildCircuit(gates: Gate[]) {
        // Clear existing gates
        this.gates.forEach(gate => this.group.remove(gate));
        this.gates.clear();

        gates.forEach((gate, index) => {
            const gateGroup = this.createGate3D(gate, index);
            this.gates.set(`gate_${index}`, gateGroup);
            this.group.add(gateGroup);
        });
    }

    private createGate3D(gate: Gate, position: number): THREE.Group {
        const gateGroup = new THREE.Group();

        const geometry = new THREE.BoxGeometry(1, 1, 0.2);
        let material: THREE.Material;

        switch (gate.type) {
            case 'H':
                material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                break;
            case 'X':
                material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                break;
            case 'CNOT':
                material = new THREE.MeshPhongMaterial({ color: 0x0088ff });
                break;
            default:
                material = new THREE.MeshPhongMaterial({ color: 0x888888 });
        }

        const box = new THREE.Mesh(geometry, material);
        gateGroup.add(box);

        const label = document.createElement('div');
        label.textContent = gate.type;
        label.style.color = 'white';
        label.style.fontWeight = 'bold';

        const labelObject = new CSS2DObject(label);
        labelObject.position.set(0, 0, 0.2);
        gateGroup.add(labelObject);

        gateGroup.position.x = position * 2;
        gateGroup.position.y = gate.qubits[0] * 1.5;

        return gateGroup;
    }

    public async animateGate(gate: Gate, duration: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }
}