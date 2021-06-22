
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.129.0-s11MgzfqGP1yDDoEH9m1/mode=imports,min/optimized/three.js';

// import { GUI } from './threejs/libs/dat.gui.min.js';


export default class MainVizTDModel {

    constructor() {
        this.scene;
        this.camera;
        this.renderer;
        this.parameters;
        this.materials = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;
        this.animateHandler = this.animate.bind(this);
        this.numParticles = 250;

        this.observers = [];

        this.speed = 0;
        this.position = 0;
        this.rounded = 0;


        this.sections = [
            {
                id: "exhibitionIntro",
                active: 1
            },
            {
                id: "exhibitionProcess",
                active: 0
            }, {
                id: "exhibitionExplanation",
                active: 0
            }, {
                id: "exhibitionSpread",
                active: 0
            }, {
                id: "visContainer",
                active: 0
            }
        ]
    }

    //add observers to the model
    addObserver(observer) {
        this.observers.push(observer);

    }
    //remove observer from the observers list
    removeObserver(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    // USE this function to notify all observers the changes
    notifyObservers(changeDetails) {
        for (var i = 0; i < this.observers.length; i++) {
            this.observers[i].update(changeDetails);
        }
    }

    stepActiveSection() {
        const index = this.sections.findIndex(e => e.active == 1);
        const step = index + 1 > this.sections.length - 1 ? 0 : index + 1;
        this.sections.map((e, i) => {
            e.active = i == step ? 1 : 0;
            return e;
        })
        this.notifyObservers({ type: "changeVisState" });
    }

    getActiveSection() {
        return this.sections.findIndex(e => e.active == 1)
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
        this.camera.position.z = 1000;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0008);

        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        const textureLoader = new THREE.TextureLoader();

        // const sprite1 = textureLoader.load('./img/textures/snowflake1.png');
        // const sprite2 = textureLoader.load('./img/textures/snowflake2.png');
        // const sprite3 = textureLoader.load('./img/textures/snowflake3.png');
        const sprite4 = textureLoader.load('./img/textures/snowflake4.png');
        const sprite5 = textureLoader.load('./img/textures/snowflake5.png');

        for (let i = 0; i < this.numParticles; i++) {

            const x = Math.random() * 2000 - 1000;
            const y = Math.random() * 2000 - 1000;
            const z = Math.random() * 2000 - 1000;

            vertices.push(x, y, z);

        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        this.parameters = [
            [[1.0, 0.2, 0.5], sprite4, 20],
            [[0.95, 0.1, 0.5], sprite5, 15],
            [[0.90, 0.05, 0.5], sprite4, 10],
            [[0.85, 0, 0.5], sprite5, 8],
            [[0.80, 0, 0.5], sprite4, 5]
        ];

        for (let i = 0; i < this.parameters.length; i++) {

            const color = this.parameters[i][0];
            const sprite = this.parameters[i][1];
            const size = this.parameters[i][2];

            this.materials[i] = new THREE.PointsMaterial({ size: size, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true });
            this.materials[i].color.setHSL(color[0], color[1], color[2]);

            const particles = new THREE.Points(geometry, this.materials[i]);

            particles.rotation.x = Math.random() * 6;
            particles.rotation.y = Math.random() * 6;
            particles.rotation.z = Math.random() * 6;

            this.scene.add(particles);

        }

        //

        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);


        //ACTIVATE LATER
        // document.body.appendChild(this.renderer.domElement);
        // document.body.style.touchAction = 'none';
        // document.body.addEventListener('pointermove', onPointerMove);
        // window.addEventListener('resize', onWindowResize);
    }
    getRenderer() {
        return this.renderer;
    }

    setMouse(_mX = undefined, _mY = undefined) {
        this.mouseX = _mX == undefined ? this.mouseX : _mX - this.windowHalfX;
        this.mouseY = _mY == undefined ? this.mosueY : _mY - this.windowHalfY;
    }

    updateSize(winW, winH) {
        this.windowHalfX = winW / 2;
        this.windowHalfY = winH / 2;

        this.camera.aspect = winW / winH;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(winW, winH);
    }

    updateSpeed(delta) {
        this.speed += delta * 0.0003;
    }

    raf() {
        this.position += this.speed;
        this.speed *= 0.8;

        this.rounded = Math.round(this.position);
        let diff = (this.rounded - this.position)
        // this.position += Math.sign(diff) * Math.pow(Math.abs(diff), 0.8) * 0.015
        // console.log(this.rounded)
    }

    //

    animate() {
        window.requestAnimationFrame(this.animateHandler);
        this.render();
    }

    render() {
        const time = Date.now() * 0.00005;

        // this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.006;
        // this.camera.position.y += (- this.mouseY - this.camera.position.y) * 0.006;

        // this.camera.lookAt(this.scene.position);

        for (let i = 0; i < this.scene.children.length; i++) {

            const object = this.scene.children[i];

            if (object instanceof THREE.Points) {
                object.rotation.y = time * (i < 4 ? i + 1 : - (i + 1));
            }

        }

        for (let i = 0; i < this.materials.length; i++) {

            const color = this.parameters[i][0];
            const h = (360 * (color[0] + time) % 360) / 360;
            this.materials[i].color.setHSL(h, color[1], color[2]);

        }

        this.raf()

        this.renderer.render(this.scene, this.camera);

    }

}