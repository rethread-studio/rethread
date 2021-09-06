
// import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.129.0-s11MgzfqGP1yDDoEH9m1/mode=imports,min/optimized/three.js';
import * as THREE from '../threejs/build/three.module.js';
import { OrbitControls } from '../threejs/examples/jsm/controls/OrbitControls.js'

import { model } from '../app.js'

export default class MainVizTDModel {

    constructor() {

        this.resMgr = new ResourceTracker();
        this.track = this.resMgr.track.bind(this.resMgr);

        this.scene;
        this.camera;
        this.renderer;

        this.materials = [];
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;
        this.animateHandler = this.animate.bind(this);
        this.rafReq;
        this.numParticles = 50; //100

        this.observers = [];

        this.speed = 0;
        this.position = 0;
        this.rounded = 0;

        this.groups = [];
        this.materialsImage = [];
        this.meshes = [];

        this.timeImage = 0

        this.controls;

        this.viewParticles = true;

        model.addObserver(this);

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
                id: "mainExhibit",
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

    activateSection(name) {
        this.sections.map(e => {
            e.active = e.id == name ? 1 : 0;
            return e;
        })
        this.notifyObservers({ type: "changeVisState" });
    }

    getActiveSection() {
        return this.sections.findIndex(e => e.active == 1)
    }

    resetActiveSection() {
        this.sections = this.sections.map((s, i) => {
            s.active = i == 0 ? 1 : 0;
            return s;
        })
    }

    init() {
        // this.camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 2000);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
        this.camera.position.z = 1000;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0008);


        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;



        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        //ADD LATER
        window.addEventListener('resize', () => {
            if (this.viewParticles == true) {

                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            } else {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.upDateImages()
            }
        });
    }




    toggleParticles(toView = true) {
        //if the same as current view ommit
        if (this.viewParticles == toView) return;

        this.viewParticles = toView;

        if (this.viewParticles) {
            this.resetCameraPos()
            this.addParticles();
        } else {
            this.resetCameraPos()
            this.removeParticles();
        }
    }

    resetCameraPos() {
        //fov
        this.camera.fov = 75;
        //aspect
        this.camera.aspect = window.innerWidth / window.innerHeight;
        //near
        this.camera.near = 1;
        //far
        this.camera.far = 2000;
        //position
        this.camera.position.z = 1000;
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        //update projeciton matrix
        this.camera.updateProjectionMatrix();
    }

    removeParticles() {
        this.materials = [];
        //remove this.scene particle
        this.scene.children
            .filter(o => o.type == "Points")
            .forEach(p => this.scene.remove(p))
    }

    addParticles() {
        // const helper = new THREE.CameraHelper(this.camera);
        // this.scene.add(helper);
        const geometry = this.track(new THREE.BufferGeometry());
        const vertices = [];
        const textureLoader = this.track(new THREE.TextureLoader());
        // const sprite3 = textureLoader.load('./img/textures/snowflake3.png');
        const sprite4 = this.track(textureLoader.load('./img/textures/snowflake4.png'));
        const sprite5 = this.track(textureLoader.load('./img/textures/snowflake5.png'));

        //ADD ALL THE PARTICLES
        for (let i = 0; i < this.numParticles; i++) {
            const x = Math.random() * 2000 - 1000;
            const y = Math.random() * 2000 - 1000;
            const z = Math.random() * 2000 - 1000;
            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const parameters = [
            [[1.0, 0.2, 0.5], sprite4, 20],
            [[0.95, 0.1, 0.5], sprite5, 15],
            [[0.90, 0.05, 0.5], sprite4, 10],
            [[0.85, 0, 0.5], sprite5, 8],
            [[0.80, 0, 0.5], sprite4, 5]
        ];

        for (let i = 0; i < parameters.length; i++) {

            const color = parameters[i][0];
            const sprite = parameters[i][1];
            const size = parameters[i][2];

            this.materials[i] = this.track(new THREE.PointsMaterial({ size: size, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
            this.materials[i].color.setHSL(color[0], color[1], color[2]);

            const particles = this.track(new THREE.Points(geometry, this.materials[i]));

            particles.rotation.x = Math.random() * 6;
            particles.rotation.y = Math.random() * 6;
            particles.rotation.z = Math.random() * 6;

            this.scene.add(particles);
        }
    }

    showScreenShot() {
        //get the url from the model
        const screenShot = model.getImagesFromSite().filter(i => i.view == "screenshot")[0];

        //TRAK 
        let mat = this.ctrMaterial().clone();
        this.materialsImage.push(mat);
        let group = new THREE.Group();
        //TRAK
        const texture = new THREE.Texture(screenShot.img);
        mat.uniforms.texture1.value = texture;
        mat.uniforms.texture1.value.needsUpdate = true;

        //TRAK
        let geo = this.track(new THREE.PlaneBufferGeometry(1.8058690745, 1, 20, 20));
        const material = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture }));
        let mesh = this.track(new THREE.Mesh(geo, material));

        group.add(mesh);
        this.groups.push(group);
        this.scene.add(group);
        this.meshes.push(mesh);

        mesh.position.y = 0;
        mesh.position.x = 0;
        mesh.position.z = 800;

        //FIT TO CAMERA
        const deviceW = Math.max(document.documentElement.clientWidth, window.innerWidth);
        let camVal = deviceW < 768 ? 0.9 : deviceW < 1300 ? 0.8 : deviceW < 1700 ? 0.7 : deviceW > 1300 ? 0.6 : 0.5;
        this.fitCameraToSelection(this.camera, this.controls, this.meshes, camVal)

    }

    addMaterial() {
        this.material = this.track(new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { type: "f", value: 0 },
                distanceFromCenter: { type: "f", value: 3 }, // The value here determines the zoom of the image in the center
                texture1: { type: "t", value: null },
                resolution: { type: "v4", value: new THREE.Vector4() },
                uvRate1: { value: new THREE.Vector2(1, 1) },
            },
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
        }));
    }

    ctrMaterial() {

        return this.material = this.track(new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable",
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { type: "f", value: 0 },
                texture1: { type: "t", value: null },
                u_resolution: { value: new THREE.Vector2(800, 443) },
            },
            fragmentShader: document.getElementById('CRTfragmentshader').textContent,
        }));
    }


    getRenderer() {
        return this.renderer;
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

    }


    //dispose resourses
    //should dispose: textures, geometries and materials
    removeImages() {
        // //restore camera position
        // this.groups.forEach(e => {
        //     this.scene.remove(e)
        // })

        // this.meshes.forEach(m => {
        //     m.geometry.dispose();
        //     //dispose texture
        //     m.material.dispose();
        //     m = undefined;
        // })

        // this.materialsImage.forEach(m => {
        //     m.dispose();
        // })

        // this.removeParticles()
        this.resMgr.dispose();

        for (let i = 0; i < this.scene.children.length; i++) {
            const object = this.scene.children[i];
            this.scene.remove(object)
        }
        this.groups = [];
        this.materialsImage = [];
        this.meshes = [];
    }

    //

    animate() {
        this.rafReq = requestAnimationFrame(this.animateHandler);
        this.render();
    }

    removeAnimation() {
        if (this.rafReq) cancelAnimationFrame(this.rafReq);
    }

    showNewLayout() {
        this.showSpreadSites()
        const dof = model.getNumActiveSites()
        const deviceW = Math.max(document.documentElement.clientWidth, window.innerWidth);
        let camVal = deviceW < 768 ? [0.9, 0.8] : deviceW < 1300 ? [0.8, 0.9] : deviceW < 1700 ? [0.7, 0.8] : deviceW > 1700 ? [0.6, 0.8] : [0.5, 0.8];
        this.fitCameraToSelection(this.camera, this.controls, this.meshes, dof == 1 ? camVal[0] : camVal[1])
    }


    showSpreadSites() {
        const sites = model.getSitesImages();
        const initX = -4;
        const size = 2;
        const spread = size * 1.5 + size / 2;

        sites.forEach((site, i) => {
            site.images.forEach((img, j) => {
                let mat = this.material.clone();
                this.materialsImage.push(mat);
                let group = new THREE.Group();
                // mat.wireframe = true;

                const texture = new THREE.Texture(img.img)
                mat.uniforms.texture1.value = texture
                mat.uniforms.texture1.value.needsUpdate = true;

                let geo = img.view == "screenshot" ? this.track(new THREE.PlaneBufferGeometry((1.80780487805 * size), (1 * size), 20, 20)) : this.track(new THREE.CircleBufferGeometry(size, 40))
                let mesh;
                if (img.view == "screenshot") {
                    const material = this.track(new THREE.MeshBasicMaterial({ map: texture }));
                    mesh = this.track(new THREE.Mesh(geo, material));
                } else {
                    mesh = this.track(new THREE.Mesh(geo, mat));
                }
                group.add(mesh);
                this.groups.push(group);
                this.scene.add(group);
                this.meshes.push(mesh);
                mesh.position.y = spread * -i;
                mesh.position.x = initX + spread * j;
                mesh.position.z = 985;
            })
        });

    }

    renderViews() {
        if (this.materialsImage) {
            this.materialsImage.forEach((m) => {
                m.uniforms.time.value = this.timeImage;
            });
        }
        this.renderer.render(this.scene, this.camera);
    }

    render() {
        const time = Date.now() * 0.00002;
        this.timeImage += 0.01;

        for (let i = 0; i < this.scene.children.length; i++) {
            const object = this.scene.children[i];
            if (object instanceof THREE.Points) {
                object.rotation.y = time * (i < 4 ? i + 1 : - (i + 1));
            }
        }
        this.renderer.render(this.scene, this.camera);
    }

    upDateImages() {
        const state = this.getActiveSection()
        this.removeImages()
        this.addMaterial();
        //get state
        if (state == 0) {
            this.showScreenShot();
        } else {
            this.showNewLayout();
        }
    }




    fitCameraToSelection(camera, controls, selection, fitOffset = 1.2) {
        const box = new THREE.Box3();

        for (const object of selection) box.expandByObject(object);

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxSize = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / camera.aspect;
        const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

        const direction = controls.target.clone()
            .sub(camera.position)
            .normalize()
            .multiplyScalar(distance);

        controls.maxDistance = distance * 10;
        controls.target.copy(center);

        camera.near = distance / 100;
        camera.far = distance * 100;
        camera.updateProjectionMatrix();

        camera.position.copy(controls.target).sub(direction);

        controls.update();
    }
    update(changeDetails) {
        if (changeDetails.type == "displayUpdate") {
            this.upDateImages()
            this.render()
        } else if (changeDetails.type == "updateImages") {
            this.upDateImages()
            this.renderViews()
        } else if (changeDetails.type == "reRender") {
            this.renderViews()
        }
    }

}

class ResourceTracker {
    constructor() {
        this.resources = new Set();
    }
    track(resource) {
        if (!resource) {
            return resource;
        }

        // handle children and when material is an array of materials or
        // uniform is array of textures
        if (Array.isArray(resource)) {
            resource.forEach(resource => this.track(resource));
            return resource;
        }

        if (resource.dispose || resource instanceof THREE.Object3D) {
            this.resources.add(resource);
        }
        if (resource instanceof THREE.Object3D) {
            this.track(resource.geometry);
            this.track(resource.material);
            this.track(resource.children);
        } else if (resource instanceof THREE.Material) {
            // We have to check if there are any textures on the material
            for (const value of Object.values(resource)) {
                if (value instanceof THREE.Texture) {
                    this.track(value);
                }
            }
            // We also have to check if any uniforms reference textures or arrays of textures
            if (resource.uniforms) {
                for (const value of Object.values(resource.uniforms)) {
                    if (value) {
                        const uniformValue = value.value;
                        if (uniformValue instanceof THREE.Texture ||
                            Array.isArray(uniformValue)) {
                            this.track(uniformValue);
                        }
                    }
                }
            }
        }
        return resource;
    }
    untrack(resource) {
        this.resources.delete(resource);
    }
    dispose() {
        for (const resource of this.resources) {
            if (resource instanceof THREE.Object3D) {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
            }
            if (resource.dispose) {
                resource.dispose();
            }
        }
        this.resources.clear();
    }
}