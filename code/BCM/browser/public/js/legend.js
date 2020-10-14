

//SERVICE PARTICLE VIZ OPTIONS
const optionsLegends = {

    length: 400,
    fov: 90,

    installation: false,

    colors: {
        url: 0xee4035,
        service: 0x0a0a0a,
        package: 0x000000,
    },
    showLabels: true,
    lightHelpers: false,
    angleStep: 30,

    legendItems: [
        {
            type: "URL",
            subType: "",
            color: 0xF28527,
        },
        {
            type: "Service",
            subType: "",
            color: 0xF28527,
        },
        {

            type: "package",
            subType: "ping",
            color: 0x8E68BA,
        },
        {
            type: "package",
            subType: "websocket",
            color: 0xF28527,
        },
        {
            type: "package",
            subType: "xmlhttprequest",
            color: 0x4F9E39,
        },
        {
            type: "package",
            subType: "font",
            color: 0xC7382C,
        },
        {
            type: "package",
            subType: "stylesheet",
            color: 0xD67BBF,
        },
        {
            type: "package",
            subType: "image",
            color: 0xBEBD3A,
        },
        {
            type: "package",
            subType: "script",
            color: 0x51BBCE,
        },
        {
            type: "package",
            subType: "sub_frame",
            color: 0xAECDE1,
        },
        {
            type: "package",
            subType: "media",
            color: 0xBBDD93,
        },
        {
            type: "package",
            subType: "other",
            color: 0xFFFEA6,
        },
        {
            type: "package",
            subType: "main_frame",
            color: 0xD1352B,
        },
        {
            type: "default",
            subType: "",
            color: 0xf9e20d,
        },
    ]

}
//modify styles if to match installation settings
document.body.style.paddingTop = optionsLegends.installation ? '470px' : 0;
//modify styles if to match installation settings

class Legend {
    constructor(_container, options = {}) {
        this.container = _container;
        this.options = options;
        this.elements = [];
    }

    init() {

        //BINDS

        this.render = this.render.bind(this)

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true
        });

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this.renderer.setClearColor(0x000000, 0); // the default
        //RENDERer CONFIGURATION
        this.renderer.setPixelRatio(window.devicePixelRatio);
        if (this.options.installation) {
            this.renderer.setSize(this.container.offsetWidth, 1220, false);
        } else {
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight, false);
        }

        // this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.container.append(this.renderer.domElement);

        //     //CAMERA CONFIGURATION
        this.camera = new THREE.PerspectiveCamera(
            this.options.fov,
            this.options.installation ? this.container.offsetWidth / 1220 : this.container.offsetWidth / this.container.offsetHeight,
            0.1,
            10000
        );

        this.camera.position.z = -10;
        this.camera.position.y = 0;
        this.camera.position.x = 0;
        // this.camera.rotateX(-0.4);
        this.camera.lookAt(new THREE.Vector3());

        //ADDD SCENE
        this.scene = new THREE.Scene();
        this.shape = new THREE.SphereGeometry(1, 2, 2);

        //ADD LIGHTS
        // Add directional light
        this.light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light1.position.set(30, 20, -100);
        this.scene.add(this.light1);


        this.light2 = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light2.position.set(30, -20, -100);
        this.scene.add(this.light2);

        if (this.options.lightHelpers) {
            let helper = new THREE.DirectionalLightHelper(this.light1, 5);
            this.scene.add(helper);
            let helper2 = new THREE.DirectionalLightHelper(this.light2, 5);
            this.scene.add(helper2);
        }

        //RENDERer LOOP
        requestAnimationFrame(this.render);
    }

    render() {
        this.renderer.render(this.scene, this.camera);

        const packRemove = []
        //UPDATE OBJECTS
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].update();
        }

        requestAnimationFrame(this.render);
    }


    addUrl(pos, color) {
        const newUrl = new UrlParticle(
            this.scene,
            "none",
            "URL",
            this.renderer,
            this.camera,
            pos
        )
        newUrl.init();
        this.elements.push(newUrl);
    }

    addService(pos, color) {
        const newService = new ServiceParticle(
            this.scene,
            "none",
            "Service",
            this.renderer,
            this.camera,
            pos
        )
        newService.init();
        this.elements.push(newService);
    }

    addPackage(pos, color, name) {
        const newService = new PackageParticle(
            this.scene,
            "none",
            name,
            this.renderer,
            this.camera,
            color,
            pos
        )
        newService.init();
        this.elements.push(newService);
    }

}

class UrlParticle {
    constructor(scene, method, type, renderer, camera, pos) {
        this.scene = scene;
        this.type = type;
        this.renderer = renderer;
        this.camera = camera
        //GET OR POST
        this.method = method;
        this.direction = 1;
        this.labelContainerElem = document.querySelector('#labels')
        this.elem;
        this.tempV = new THREE.Vector3();
        this.geometry;
        this.material;
        this.shape;
        this.tempV = new THREE.Vector3();
        this.pos = pos;

    }

    init() {


        this.geometry = new THREE.DodecahedronBufferGeometry(0.8);
        this.material = new THREE.MeshPhongMaterial({ color: 0xee4035 });
        this.shape = new THREE.Mesh(this.geometry, this.material);
        this.shape.position.copy(new THREE.Vector3(this.pos, 0, 0))
        this.scene.add(this.shape);

        this.elem = document.createElement('div');
        this.elem.classList.add("url-text");
        this.methEl = document.createElement('div');
        this.elem.textContent = this.type;
        this.methEl.textContent = this.method;
        this.labelContainerElem.appendChild(this.elem);


    }

    update() {
        this.updateText();
        this.shape.rotateX(-0.001)
        this.shape.rotateY(-0.001)
    }

    updateText() {
        const canvas = this.renderer.domElement;
        // get the position of the center of the cube
        this.shape.updateWorldMatrix(true, false);
        this.shape.getWorldPosition(this.tempV);

        // get the normalized screen coordinate of that position
        // x and y will be in the -1 to +1 range with x = -1 being
        // on the left and y = -1 being on the bottom
        this.tempV.project(this.camera);

        // convert the normalized position to CSS coordinates
        const x = (this.tempV.x * .5 + .5) * canvas.clientWidth;
        const y = (this.tempV.y * -.5 + .5) * canvas.clientHeight;
        // move the elem to that position
        this.elem.style.transform = `translate(-50%, 250%) translate(${x}px,${y}px)`;
    }
}

class ServiceParticle {
    constructor(scene, method, type, renderer, camera, pos) {
        this.scene = scene;
        this.type = type;
        this.renderer = renderer;
        this.camera = camera
        //GET OR POST
        this.method = method;
        this.direction = 1;
        this.labelContainerElem = document.querySelector('#labels')
        this.elem;
        this.tempV = new THREE.Vector3();
        this.geometry;
        this.material;
        this.shape;
        this.tempV = new THREE.Vector3();
        this.pos = pos
    }

    init() {

        this.geometry = new THREE.DodecahedronBufferGeometry(0.4);
        this.material = new THREE.MeshPhongMaterial({ color: 0x6A82FB });
        this.shape = new THREE.Mesh(this.geometry, this.material);
        this.shape.position.copy(new THREE.Vector3(this.pos, 0, 0))
        this.scene.add(this.shape);

        this.elem = document.createElement('div');
        this.elem.classList.add("url-text");
        this.methEl = document.createElement('div');
        this.elem.textContent = this.type;
        this.methEl.textContent = this.method;
        this.labelContainerElem.appendChild(this.elem);

    }

    update() {
        this.updateText();
        this.shape.rotateX(0.001)
        this.shape.rotateY(0.001)
    }

    updateText() {
        const canvas = this.renderer.domElement;
        // get the position of the center of the cube
        this.shape.updateWorldMatrix(true, false);
        this.shape.getWorldPosition(this.tempV);

        // get the normalized screen coordinate of that position
        // x and y will be in the -1 to +1 range with x = -1 being
        // on the left and y = -1 being on the bottom
        this.tempV.project(this.camera);

        // convert the normalized position to CSS coordinates
        const x = (this.tempV.x * .5 + .5) * canvas.clientWidth;
        const y = (this.tempV.y * -.5 + .5) * canvas.clientHeight;
        // move the elem to that position
        this.elem.style.transform = `translate(-50%, 250%) translate(${x}px,${y}px)`;
    }
}

class PackageParticle {
    constructor(scene, method, type, renderer, camera, color, pos) {
        this.scene = scene;
        this.type = type;
        this.renderer = renderer;
        this.camera = camera
        //GET OR POST
        this.method = method;
        this.direction = 1;
        this.labelContainerElem = document.querySelector('#labels')
        this.elem;
        this.tempV = new THREE.Vector3();
        this.geometry;
        this.material;
        this.shape;
        this.tempV = new THREE.Vector3();
        this.color = color;
        this.pos = pos;
    }

    init() {

        this.geometry = new THREE.DodecahedronBufferGeometry(0.4);
        this.material = new THREE.MeshPhongMaterial({ color: this.color });
        this.shape = new THREE.Mesh(this.geometry, this.material);
        this.shape.position.copy(new THREE.Vector3(this.pos, 0, 0))
        this.scene.add(this.shape);

        this.elem = document.createElement('div');
        this.elem.classList.add("url-text");
        this.methEl = document.createElement('div');
        this.elem.textContent = this.type;
        this.methEl.textContent = this.method;
        this.labelContainerElem.appendChild(this.elem);

    }

    update() {
        this.updateText();
        this.shape.rotateX(0.001)
        this.shape.rotateY(0.001)
    }

    updateText() {
        const canvas = this.renderer.domElement;
        // get the position of the center of the cube
        this.shape.updateWorldMatrix(true, false);
        this.shape.getWorldPosition(this.tempV);

        // get the normalized screen coordinate of that position
        // x and y will be in the -1 to +1 range with x = -1 being
        // on the left and y = -1 being on the bottom
        this.tempV.project(this.camera);

        // convert the normalized position to CSS coordinates
        const x = (this.tempV.x * .5 + .5) * canvas.clientWidth;
        const y = (this.tempV.y * -.5 + .5) * canvas.clientHeight;
        // move the elem to that position
        this.elem.style.transform = `translate(-50%, 250%) translate(${x}px,${y}px)`;
    }
}

const containerViz = document.getElementById("container-legend");
const legend = new Legend(containerViz, optionsLegends);
legend.init()

for (let i = 0; i <= optionsLegends.legendItems.length - 1; i++) {
    const item = optionsLegends.legendItems[i];
    const width = (optionsLegends.legendItems.length * 3) / 2;
    const pos = width - 3 - (i * 3);

    switch (item.type) {
        case "URL":
            legend.addUrl(pos, item.color);
            break;
        case "Service":

            legend.addService(pos, item.color);
            break;
        case "package":
            const name = item.subType;
            legend.addPackage(pos, item.color, name);
            break;
        default:
            break;
    }
}

