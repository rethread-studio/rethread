
class AppViz {
    constructor(_container, options = {}) {
        //CONTAINER CONFIG
        this.container = _container;
        //USE options to configure things
        this.options = options;
        this.simplex = new SimplexNoise()
        this.packages = [];
        this.services = [];
        this.urls = [];
        this.font;
        this.camera;
        this.anglePos = 0;
        this.zPos = 0;
        this.radius = 2;
        this.maxServices = 40;
        this.servCounter = 0;
        this.urlElement = null;


    }

    init() {
        const loader = new THREE.FontLoader();

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
        for (let i = 0; i <= this.packages.length - 1; i++) {
            this.packages[i].update();
            if (this.packages[i].status == "REMOVE") packRemove.push(this.packages[i].getRequestId())
        }
        // REMOVE OBJECTS
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

        if (this.services.length == 0 && this.zPos != 10) {
            this.resetZPos()
            this.resetRadius();
        }


        if (this.urlElement != null) this.urlElement.update();

        requestAnimationFrame(this.render);
    }

    removePackage(requestId, arr) {

        return arr.filter(p => { p.requestId == requestId })
    }


    addPackage(method, type, timeStamp, service) {
        //FIND THE SERVICE
        const s = this.getService(service);
        //ADD A PACKAGE TO THE SERVICE
        //if it exists add more time to live
        s.updateTime();
        s.addPackagesNum();
        //if it exists add to size
        //add the figure 
        //change the position of the package related to the service

        const position = {
            servicePos: s.shape.position,
            posZ: s.zPos,
            radius: s.radius,
            angle: s.anglePos

        }

        const newPackage = new PackageParticle(this.scene, method, type, this.font, this.camera, this.renderer, timeStamp, this.options.showLabels, position);
        newPackage.init();
        this.packages.push(newPackage);
    }

    addService(name, type, timeStamp) {
        if (!this.services.find(i => i.getName() == name)) {
            const newService = new serviceParticle(this.scene, name, name, this.font, this.camera, this.renderer, timeStamp, this.anglePos, this.zPos, this.options.showLabels, this.radius)
            newService.init();
            this.services.push(newService);
            this.stepAnglePos();
            this.stepZPos()
            this.stepRadius();
            this.servCounter++;


        } else {
            // this.services.find(i => i.getName() == name).updateTime()
        }
        if (this.servCounter >= this.maxServices) {
            this.servCounter = 0;
            this.resetZPos()
            this.resetRadius();
        }
    }
    //code for getting position
    getCircularPosition(angle, radius, posZ) {
        return new THREE.Vector3(
            radius * Math.sin(angle),
            radius * Math.cos(angle),
            posZ
        );
    }

    getService(name) {
        return this.services.find(i => i.getName() == name);
    }

    addURL(name, timeStamp) {
        if (this.urlElement == null) {
            const newURL = new urlParticle(this.scene, name, name, this.font, this.camera, this.renderer, timeStamp)
            newURL.init();
            this.urlElement = newURL;

        } else {
            this.urlElement.setLabel(name)
        }

    }


    stepRadius() {
        this.radius += 0.2;
    }

    stepAnglePos() {
        this.anglePos = this.anglePos + 20;
    }

    resetZPos() {
        this.zPos = 10;
    }

    resetRadius() {
        this.radius = 4;
    }

    stepZPos() {
        this.zPos -= 0.4;
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

class PackageParticle {

    constructor(scene, method, type, font, camera, renderer, requestId, showLabel, position) {
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
        this.timeStamp = Date.now() + (3 * 1000);
        this.status = 'ACTIVE'
        this.requestId = requestId;
        this.showLabel = showLabel;
        this.servicePos = position.servicePos
        this.angle = Math.random() * Math.PI * 2;//position.angle;
        this.radius = 0;//position.radius
        this.posZ = position.servicePos.z
        this.speed = Math.random() / 100;
        //get the position setup
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
        this.geometry = new THREE.OctahedronGeometry(0.1, 0);
        this.material = new THREE.MeshPhongMaterial({ color: 0xf9e20d });
        this.shape = new THREE.Mesh(this.geometry, this.material);


        //position of the shape 
        const randomPos = this.random3DPosition(10);
        this.shape.position.copy(this.servicePos)
        // const sparkle = this.totesRando(0.003, 0.5);
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

    //code for getting position
    getCircularPosition(angle, radius, posZ) {
        return new THREE.Vector3(
            radius * Math.sin(angle) + this.servicePos.x,
            radius * Math.cos(angle) + this.servicePos.y,
            posZ
        );
    }

    update() {

        this.radius += (this.speed * this.direction);
        // this.angle += 0.05;
        this.shape.position.copy(this.getCircularPosition(this.angle, this.radius, this.posZ))
        // = this.shape.position.x + (0.05 * this.direction);
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

    constructor(scene, method, type, font, camera, renderer, requestId, anglePos, zPos, showLabel, radius) {
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
        this.anglePos = anglePos;
        this.radius = radius;
        this.zPos = zPos;
        this.showLabel = showLabel;
        this.packagesNum = 0;
        this.speed = 0.004;//Math.random() / 100;
        // this.packages = [];
    }

    updateTime() {
        this.timeStamp = this.timeStamp + 50;
    }

    addPackagesNum() {
        this.packagesNum++;
        const scale = this.shape.scale;
        const step = 0.0001;
        this.shape.scale.set(
            Math.min(5, scale.x + (step * this.packagesNum)),
            Math.min(5, scale.y + (step * this.packagesNum)),
            Math.min(5, scale.z + (step * this.packagesNum)));
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

    getCircularPosition(angle) {
        return new THREE.Vector3(
            this.radius * Math.sin(angle),
            this.radius * Math.cos(angle),
            this.zPos
        );
    }



    init() {
        // const adjustedSize = Math.abs(this.simplex.noise3D(1, 1, 1) * 0.5);
        this.geometry = new THREE.DodecahedronBufferGeometry(0.4);
        this.material = new THREE.MeshPhongMaterial({ color: 0x6A82FB });
        this.shape = new THREE.Mesh(this.geometry, this.material);
        this.shape.castShadow = true;
        this.shape.recieveShadow = true;

        const randomPos = this.getCircularPosition(this.anglePos);
        this.shape.position.copy(randomPos)
        // const sparkle = this.totesRando(0.1, 0.7);
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

        if (this.showLabel) {
            this.elem = document.createElement('div');
            this.elem.classList.add("service-text");
            this.methEl = document.createElement('div');
            this.elem.textContent = this.type;
            this.methEl.textContent = this.method;
            this.labelContainerElem.appendChild(this.elem);
        }



    }

    removeElement() {
        if (this.showLabel) this.labelContainerElem.removeChild(this.elem);
        //REMOVE 3D OBJECT
        this.shape.geometry.dispose();
        this.shape.material.dispose();
        this.scene.remove(this.shape)

    }

    update() {


        // this.shape.position.x = this.shape.position.x + (0.005 * this.direction);
        if (this.showLabel) this.updateText();
        //CHECK STATE
        if (Date.now() > this.timeStamp) this.status = "REMOVE"
        this.radius += this.speed;
        this.shape.position.copy(this.getCircularPosition(this.anglePos))
        // this.shape.rotateX(-0.01)
        // this.shape.rotateY(0.01)
        // this.shape.rotateZ(0.01)

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
        this.elem.style.transform = `translate(12%, -50%) translate(${x}px,${y}px)`;
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


class urlParticle {

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
        this.geometry = new THREE.DodecahedronBufferGeometry(0.4);
        this.material = new THREE.MeshPhongMaterial({ color: 0xee4035 });
        this.shape = new THREE.Mesh(this.geometry, this.material);


        const randomPos = this.random3DPosition(1);
        // this.shape.position.copy(randomPos)
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
        this.shape.rotateX(0.01)
        this.shape.rotateY(0.01)
        // this.shape.rotateZ(0.01)

    }

    setLabel(name) {
        this.type = name
        this.elem.textContent = this.type;
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
        this.elem.style.transform = `translate(30%, -50%) translate(${x}px,${y}px)`;
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


