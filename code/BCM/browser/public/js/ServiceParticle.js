
class AppViz {
    constructor(_container, options = {}) {
        //CONTAINER CONFIG
        this.container = _container;
        //USE options to configure things
        this.options = options;
        this.simplex = new SimplexNoise()
        this.packages = [];
        this.services = [];
        this.font;
        this.camera;
    }

    init() {
        const loader = new THREE.FontLoader();
        let fload;
        const thisApp = this;
        loader.load("fonts/" + "helvetiker_regular.typeface.json", function (
            response
        ) {
            thisApp.font = response;
        });
        //BINDS
        this.render = this.render.bind(this)

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: true
        });
        this.renderer.setClearColor(0x000000, 0); // the default
        //RENDERer CONFIGURATION
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight, false);
        this.renderer.setSize(this.container.offsetWidth, 1220, false);

        // this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.container.append(this.renderer.domElement);

        //     //CAMERA CONFIGURATION
        this.camera = new THREE.PerspectiveCamera(
            this.options.fov,
            this.container.offsetWidth / 1220,
            0.1,
            10000
        );
        this.camera.position.z = -5;
        this.camera.position.y = -4;
        this.camera.position.x = -4;
        // this.camera.rotateX(-0.4);
        this.camera.lookAt(new THREE.Vector3());

        //ADDD SCENE
        this.scene = new THREE.Scene();
        this.shape = new THREE.SphereGeometry(1, 2, 2);

        //ADD LIGHTS
        // Add directional light
        this.light1 = new THREE.DirectionalLight('teal', 0.5);
        this.light1.position.set(4, 4, 4)
        this.scene.add(this.light1);

        //RENDERer LOOP
        requestAnimationFrame(this.render);
    }

    render() {
        this.renderer.render(this.scene, this.camera);

        const packRemove = []
        //UPDATE OBJECTS
        for (let i = 0; i <= this.packages.length - 1; i++) {
            this.packages[i].update();
            if (this.packages[i].status == "REMOVE") packRemove.push(this.packages[i].getRequestId())
        }
        //REMOVE OBJECTS
        if (packRemove.length != 0) {
            this.packages = this.packages.filter(p => {
                const remove = !packRemove.includes(p.getRequestId());
                if (remove == false) p.removeElement()
                return remove;
            })
        }

        //UPDATE SERVICES
        const servicesRemove = [];
        for (let i = 0; i <= this.services.length - 1; i++) {
            this.services[i].update();
            if (this.services[i].status == "REMOVE") servicesRemove.push(this.services[i].getName())
        }
        // REMOVE OBJECTS
        if (servicesRemove.length != 0) {
            this.services = this.services.filter(p => {
                const remove = !servicesRemove.includes(p.getName());
                if (remove == false) p.removeElement()
                return remove;
            })
        }

        requestAnimationFrame(this.render);
    }

    removePackage(requestId, arr) {
        // console.log(requestId)
        return arr.filter(p => { p.requestId == requestId })
    }


    addGeometry(method, type, timeStamp) {
        const newPackage = new packageParticle(this.scene, method, type, this.font, this.camera, this.renderer, timeStamp);
        newPackage.init();
        this.packages.push(newPackage);
    }

    addService(name, type, timeStamp) {
        if (!this.services.find(i => i.getName() == name)) {
            const newService = new serviceParticle(this.scene, name, name, this.font, this.camera, this.renderer, timeStamp)
            newService.init();
            this.services.push(newService);
        } else {
            // this.services.find(i => i.getName() == name).updateTime()
        }
    }

    // //CREATE a random position
    random3DPosition(magnitude) {
        return new THREE.Vector3(
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * magnitude
        );
    }
}

class packageParticle {

    constructor(scene, method, type, font, camera, renderer, requestId) {
        this.scene = scene;
        this.type = type;
        //GET OR POST
        this.method = method;
        this.direction = this.method == "GET" ? -1 : 1;
        this.font = font;
        this.camera = camera;
        this.text;
        this.labelContainerElem = document.querySelector('#labels')
        this.elem;
        this.tempV = new THREE.Vector3();
        this.renderer = renderer;
        this.timeStamp = Date.now() + (4 * 1000);
        this.status = 'ACTIVE'
        this.requestId = requestId;
    }

    getRequestId() {
        return this.requestId;
    }



    totesRando(max, min) {
        return Math.floor(Math.random() * (1 + max - min) + min)
    }

    // //CREATE a random position
    random3DPosition(magnitude) {
        return new THREE.Vector3(
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * 5
        );
    }

    init() {

        // const adjustedSize = Math.abs(this.simplex.noise3D(1, 1, 1) * 0.5);
        this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.material = new THREE.MeshBasicMaterial({ color: 0xf9e20d });
        this.shape = new THREE.Mesh(this.geometry, this.material);

        const randomPos = this.random3DPosition(10);
        this.shape.position.copy(randomPos)
        const sparkle = this.totesRando(0.003, 0.5);
        TweenMax.to(this.shape.scale, 1, {
            duration: 10,
            x: sparkle,
            y: sparkle,
            z: sparkle,
            repeat: -1,
            yoyo: true,
            delay: randomPos.z * 0.1
        });
        this.scene.add(this.shape);

        //TEXT 
        // this.elem = document.createElement('div');
        // this.methEl = document.createElement('div');
        // this.elem.textContent = this.type;
        // this.methEl.textContent = this.method;
        // this.labelContainerElem.appendChild(this.elem);


    }

    removeElement() {
        // this.labelContainerElem.removeChild(this.elem);

        //REMOVE 3D OBJECT
        this.shape.geometry.dispose();
        this.shape.material.dispose();
        this.scene.remove(this.shape)

    }

    update() {


        this.shape.position.x = this.shape.position.x + (0.005 * this.direction);
        // this.updateText();
        //CHECK STATE
        if (Date.now() > this.timeStamp) this.status = "REMOVE"


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
        this.elem.style.transform = `translate(10%, -50%) translate(${x}px,${y}px)`;
    }

    createText(inText, pos) {
        let material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
        });
        let geometry = new THREE.TextGeometry(inText, {
            font: this.font,
            size: 10,
            height: 1,
            curveSegments: 12,
            bevelEnabled: false,
            bevelSize: 0.001,
            bevelOffset: 0.001,
            bevelSegments: 0.001,
        });

        let textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.copy(pos);
        textMesh.position.z = 30;
        textMesh.quaternion.copy(this.camera.quaternion);
        return textMesh;
    }




}

class serviceParticle {

    constructor(scene, method, type, font, camera, renderer, requestId) {
        this.scene = scene;
        this.type = type;
        //GET OR POST
        this.method = method;
        this.direction = 1;
        this.font = font;
        this.camera = camera;
        this.text;
        this.labelContainerElem = document.querySelector('#labels')
        this.elem;
        this.tempV = new THREE.Vector3();
        this.renderer = renderer;
        this.timeStamp = Date.now() + (5 * 1000);
        this.status = 'ACTIVE'
        this.requestId = requestId;
    }

    updateTime() {
        this.timeStamp = this.timeStamp + (5 * 1000)
    }

    getName() {
        return this.type;
    }

    totesRando(max, min) {
        return Math.floor(Math.random() * (1 + max - min) + min)
    }

    // //CREATE a random position
    random3DPosition(magnitude) {
        return new THREE.Vector3(
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * magnitude,
            (-1 + Math.random() * 2) * 5
        );
    }

    init() {

        // const adjustedSize = Math.abs(this.simplex.noise3D(1, 1, 1) * 0.5);
        this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.material = new THREE.MeshBasicMaterial({ color: 0xee4035 });
        this.shape = new THREE.Mesh(this.geometry, this.material);

        const randomPos = this.random3DPosition(2);
        this.shape.position.copy(randomPos)
        const sparkle = this.totesRando(0.003, 0.5);
        // TweenMax.to(this.shape.scale, 1, {
        //     duration: 10,
        //     x: sparkle,
        //     y: sparkle,
        //     z: sparkle,
        //     repeat: -1,
        //     yoyo: true,
        //     delay: randomPos.z * 0.1
        // });
        this.scene.add(this.shape);

        this.elem = document.createElement('div');
        this.elem.classList.add("service-text");
        this.methEl = document.createElement('div');
        this.elem.textContent = this.type;
        this.methEl.textContent = this.method;
        this.labelContainerElem.appendChild(this.elem);


    }

    removeElement() {
        this.labelContainerElem.removeChild(this.elem);
        //REMOVE 3D OBJECT
        this.shape.geometry.dispose();
        this.shape.material.dispose();
        this.scene.remove(this.shape)

    }

    update() {


        // this.shape.position.x = this.shape.position.x + (0.005 * this.direction);
        this.updateText();
        //CHECK STATE
        if (Date.now() > this.timeStamp) this.status = "REMOVE"


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
        this.elem.style.transform = `translate(10%, -50%) translate(${x}px,${y}px)`;
    }

    createText(inText, pos) {
        let material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
        });
        let geometry = new THREE.TextGeometry(inText, {
            font: this.font,
            size: 10,
            height: 1,
            curveSegments: 12,
            bevelEnabled: false,
            bevelSize: 0.001,
            bevelOffset: 0.001,
            bevelSegments: 0.001,
        });

        let textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.copy(pos);
        console.log(pos)
        textMesh.position.z = 30;
        // console.log(textMesh.position)
        textMesh.quaternion.copy(this.camera.quaternion);
        return textMesh;
    }




}


// function resizeRenderToDisplaySize(render, setSize) {
//     const canvas = render.domElement;
//     const width = canvas.clientWidth;
//     const height = canvas.clientHeight;
//     const needResize = canvas.width !== width || canvas.height !== height;
//     if (needResize) {
//         setSize(width, height, false);
//     }
//     return needResize;


