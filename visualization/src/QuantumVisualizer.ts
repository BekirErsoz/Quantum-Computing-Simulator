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

export class QuantumVisualizer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private labelRenderer: CSS2DRenderer;
    private controls: OrbitControls;
    private blochSpheres: Map<number, BlochSphere> = new Map();
    private stateVector: StateVectorVisualization;
    private circuit3D: Circuit3D;

    constructor(container: HTMLElement) {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 10, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Label renderer for 2D text
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        container.appendChild(this.labelRenderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
        this.controls.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        // Initialize visualizations
        this.stateVector = new StateVectorVisualization(this.scene);
        this.circuit3D = new Circuit3D(this.scene);

        // Start animation
        this.animate();
    }

    public visualizeQuantumState(state: QuantumState) {
        // Clear existing Bloch spheres
        this.blochSpheres.forEach(sphere => sphere.remove());
        this.blochSpheres.clear();

        // Create Bloch sphere for each qubit
        for (let i = 0; i < state.numQubits; i++) {
            const sphere = new BlochSphere(i);
            sphere.updateFromState(state, i);
            sphere.addToScene(this.scene);
            this.blochSpheres.set(i, sphere);
        }

        // Update state vector visualization
        this.stateVector.update(state);
    }

    public visualizeCircuit(gates: Gate[]) {
        this.circuit3D.buildCircuit(gates);
    }

    public animateGateApplication(gate: Gate, duration: number = 1000) {
        return this.circuit3D.animateGate(gate, duration);
    }

    private animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();

        // Rotate Bloch spheres
        this.blochSpheres.forEach(sphere => sphere.update());

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

class BlochSphere {
    private group: THREE.Group;
    private sphere: THREE.Mesh;
    private stateVector: THREE.ArrowHelper;
    private qubitIndex: number;

    constructor(qubitIndex: number) {
        this.qubitIndex = qubitIndex;
        this.group = new THREE.Group();

        // Sphere
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x4488ff, 
            transparent: true, 
            opacity: 0.3, 
            wireframe: true 
        });
        this.sphere = new THREE.Mesh(geometry, material);
        this.group.add(this.sphere);

        // Axes
        this.addAxes();

        // State vector arrow
        const dir = new THREE.Vector3(0, 0, 1);
        const origin = new THREE.Vector3(0, 0, 0);
        this.stateVector = new THREE.ArrowHelper(dir, origin, 1, 0xff0000, 0.3, 0.3);
        this.group.add(this.stateVector);

        // Position based on qubit index
        this.group.position.x = qubitIndex * 3;

        // Label
        const label = document.createElement('div');
        label.className = 'qubit-label';
        label.textContent = `Q${qubitIndex}`;
        label.style.color = 'white';
        const labelObject = new CSS2DObject(label);
        labelObject.position.set(0, 1.5, 0);
        this.group.add(labelObject);
    }

    private addAxes() {
        // X axis (red)
        const xAxis = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1.2, 0xff0000
        );
        this.group.add(xAxis);

        // Y axis (green)
        const yAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            1.2, 0x00ff00
        );
        this.group.add(yAxis);

        // Z axis (blue)
        const zAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1), 
            new THREE.Vector3(0, 0, 0),
            1.2, 0x0000ff
        );
        this.group.add(zAxis);
    }

    public updateFromState(state: QuantumState, qubitIndex: number) {
        // Calculate Bloch sphere coordinates from quantum state
        const { theta, phi } = this.calculateBlochAngles(state, qubitIndex);

        // Update state vector direction
        const x = Math.sin(theta) * Math.cos(phi);
        const y = Math.sin(theta) * Math.sin(phi);
        const z = Math.cos(theta);

        this.stateVector.setDirection(new THREE.Vector3(x, y, z));
    }

    private calculateBlochAngles(state: QuantumState, qubitIndex: number): { theta: number, phi: number } {
        // Simplified calculation for visualization
        const stateSize = Math.pow(2, state.numQubits);
        let alpha = { real: 0, imag: 0 };
        let beta = { real: 0, imag: 0 };

        // Extract single qubit state (simplified)
        for (let i = 0; i < stateSize; i++) {
            const bitValue = (i >> qubitIndex) & 1;
            if (bitValue === 0) {
                alpha.real += state.amplitudes[i].real;
                alpha.imag += state.amplitudes[i].imag;
            } else {
                beta.real += state.amplitudes[i].real;
                beta.imag += state.amplitudes[i].imag;
            }
        }

        // Normalize
        const norm = Math.sqrt(
            alpha.real ** 2 + alpha.imag ** 2 +
            beta.real ** 2 + beta.imag ** 2
        );

        alpha.real /= norm;
        alpha.imag /= norm;
        beta.real /= norm;
        beta.imag /= norm;

        // Calculate Bloch angles
        const theta = 2 * Math.acos(Math.sqrt(alpha.real ** 2 + alpha.imag ** 2));
        const phi = Math.atan2(beta.imag, beta.real) - Math.atan2(alpha.imag, alpha.real);

        return { theta, phi };
    }

    public addToScene(scene: THREE.Scene) {
        scene.add(this.group);
    }

    public remove() {
        this.group.parent?.remove(this.group);
    }

    public update() {
        // Gentle rotation for visual effect
        this.group.rotation.y += 0.002;
    }
}

class StateVectorVisualization {
    private group: THREE.Group;
    private bars: THREE.Mesh[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.set(0, -3, 0);
        scene.add(this.group);
    }

    public update(state: QuantumState) {
        // Clear existing bars
        this.bars.forEach(bar => this.group.remove(bar));
        this.bars = [];

        const numStates = Math.pow(2, state.numQubits);
        const barWidth = 0.8;
        const spacing = 1;

        for (let i = 0; i < numStates; i++) {
            const amplitude = state.amplitudes[i];
            const magnitude = Math.sqrt(amplitude.real ** 2 + amplitude.imag ** 2);
            const phase = Math.atan2(amplitude.imag, amplitude.real);

            // Create bar
            const geometry = new THREE.BoxGeometry(barWidth, magnitude * 5, barWidth);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(phase / (2 * Math.PI) + 0.5, 1, 0.5)
            });

            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = i * spacing - (numStates - 1) * spacing / 2;
            bar.position.y = magnitude * 2.5;

            this.bars.push(bar);
            this.group.add(bar);

            // Add label
            const label = document.createElement('div');
            label.textContent = `|${i.toString(2).padStart(state.numQubits, '0')}⟩`;
            label.style.color = 'white';
            label.style.fontSize = '12px';

            const labelObject = new CSS2DObject(label);
            labelObject.position.set(bar.position.x, -0.5, 0);
            this.group.add(labelObject);
        }
    }
}

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

        // Gate box
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

        // Gate label
        const label = document.createElement('div');
        label.textContent = gate.type;
        label.style.color = 'white';
        label.style.fontWeight = 'bold';

        const labelObject = new CSS2DObject(label);
        labelObject.position.set(0, 0, 0.2);
        gateGroup.add(labelObject);

        // Position gate
        gateGroup.position.x = position * 2;
        gateGroup.position.y = gate.qubits[0] * 1.5;

        return gateGroup;
    }

    public async animateGate(gate: Gate, duration: number): Promise<void> {
        // Animate gate application (placeholder)
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }
}
