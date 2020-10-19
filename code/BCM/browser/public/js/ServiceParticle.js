
class AppViz {
    constructor(_container, options = {}) {
        //CONTAINER CONFIG
        this.container = _container;
        //USE options to configure things
        this.options = options;
        this.packages = [];
        this.services = [];
        this.urls = [];
        this.font;
        this.camera;
        this.anglePos = 0;
        this.zPos = 0;
        this.radius = 1;
        this.maxServices = 30;
        this.servCounter = 0;
        this.urlElement = null;
        this.showServices = ["Amazon", "Github", "Instagram", "Signal", "Whatsapp", "Facebook", "Google", "Microsoft", "Slack", "Youtube", "Twitter"]
        this.packagesNames = []
        this.numServices = 0;
        this.numPackages = 0;
        this.reportNumber = 0;
        this.idle = true;
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
            this.renderer.setSize(window.innerWidth / 2, 1220, false);
        } else {

            this.renderer.setSize(window.innerWidth / 2, window.innerHeight, false);
        }

        // this.composer = new POSTPROCESSING.EffectComposer(this.renderer);
        this.container.append(this.renderer.domElement);

        //     //CAMERA CONFIGURATION
        // this.camera = new THREE.PerspectiveCamera(
        //     this.options.fov,
        //     this.options.installation ? this.container.offsetWidth / 1220 : this.container.offsetWidth / this.container.offsetHeight,
        //     0.1,
        //     10000
        // );
        this.camera = new THREE.PerspectiveCamera(
            this.options.fov,
            this.options.installation ? (window.innerWidth / 2) / 1220 : (window.innerWidth / 2) / window.innerHeight,
            0.1,
            10000
        );

        this.camera.position.z = -10;
        this.camera.position.y = 0;
        this.camera.position.x = 0;
        // this.camera.rotateX(-0.4);
        this.camera.lookAt(new THREE.Vector3());

        this.camera.updateProjectionMatrix();

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


    isIdle(inStatus) {
        //change app status and all inner items
        this.idle = inStatus;

        //URL
        this.urlElement.isIdle(this.idle)
        //All new services

        //all new packages

    }

    onWindowResize() {
        const aspectRatio = this.options.installation ? (window.innerWidth / 2) / 1220 : (window.innerWidth / 2) / window.innerHeight;
        this.camera.aspect = aspectRatio;
        this.camera.updateProjectionMatrix();

        const height = this.options.installation ? 1220 : window.innerHeight;

        this.renderer.setSize(window.innerWidth / 2, height, false);

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
    getImageNum() {
        // this.packages = [];
        // this.services = [];
        let numImages = 0;
        for (let i = 0; i <= this.packages.length; i++) {
            if (this.packages[i] != undefined) {
                if (this.packages[i].type == "image") numImages++;
            }

        }
        return numImages;
    }

    getNumCountries() {
        let c_arr = [];
        for (let i = 0; i <= this.packages.length; i++) {
            if (this.packages[i] != undefined) {
                if (!c_arr.includes(this.packages[i].country)) c_arr.push(this.packages[i].country)
            }
        }

        return c_arr.length;
    }

    publishReport() {
        this.reportNumber = this.reportNumber > 2 ? 0 : this.reportNumber + 1;

        switch (this.reportNumber) {
            case 0:
                return {
                    se: `Du besöker ${this.urlElement.getName()}, men din webbläsare kommunicerar med ${this.numServices} andra webbplatser.`,
                    en: `You visit ${this.urlElement.getName()}, but your browser communicates with ${this.numServices} other machines`
                }

            case 1:
                const numImage = this.getImageNum()
                return {
                    en: `There are ${numImage} images in ${this.urlElement.getName()}`,
                    se: `Det finns ${numImage} bilder på sidan ${this.urlElement.getName()}.`
                };

            case 2:

                const numCountries = this.getNumCountries();
                return {
                    en: `Your browser communicated with ${numCountries} countries for you to access ${this.urlElement.getName()}`,
                    se: `Din webbläsare kommunicerade med ${numCountries} länder för att hämta allt material på ${this.urlElement.getName()}.`
                };

            default:
                return {
                    en: `You connected to ${this.urlElement.getName()} and used ${this.numServices} Services which used ${this.numPackages} packages`,
                    se: `Du embendade till ${this.urlElement.getName()} och det embendade ${this.numServices} Services att embendade ${this.numPackages} packages`,
                };

            // case 1:

            // return {
            //     en: `The ${this.urlElement.getName()} webpage is as large as a <PPP>-pages book`,
            //     se: `Webbsidan ${this.urlElement.getName()} är lika stor som en bok på <PPP>`
            // };
        }
    }



    removePackage(requestId, arr) {

        return arr.filter(p => { p.requestId == requestId })
    }


    addPackage(method, type, timeStamp, service, packColor, country) {
        this.numPackages = this.numPackages + 1;
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
        if (!this.packagesNames.includes(type)) this.packagesNames.push(type)


        const newPackage = new PackageParticle(
            this.scene,
            method,
            type,
            this.font,
            this.camera,
            this.renderer,
            timeStamp,
            this.options.showLabels,
            position,
            s.randomDelay,
            packColor,
            country
        );
        newPackage.init();
        this.packages.push(newPackage);
    }

    addService(name, type, timeStamp) {


        if (!this.services.find(i => i.getName() == name)) {
            const showLabel = this.showServices.includes(name)
            const newService = new serviceParticle(
                this.scene,
                name,
                name,
                this.font,
                this.camera,
                this.renderer,
                timeStamp,
                this.anglePos,
                this.zPos,
                showLabel,
                this.radius,
                this.idle
            )
            newService.init();
            this.services.push(newService);
            this.stepAnglePos();

            this.stepRadius();
            this.servCounter++;

            this.numServices = this.numServices + 1;

        }
        if (this.servCounter >= this.maxServices) {
            this.servCounter = 0;
            this.resetZPos()
            this.resetRadius();
        }
    }

    resetCounter() {
        this.numServices = 0;
        this.numPackages = 0;
    }

    //remove all packages and all services
    //reset the counters
    resetParticles() {
        for (let i = 0; i < this.packages.length; i++) {
            this.packages[i].setOut();
        }

        for (let j = 0; j < this.services.length; j++) {
            this.services[j].setOut();
        }

        this.resetCounter()

        this.anglePos = 0;

        this.radius = 1;
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
        this.zPos = 0;
    }

    resetRadius() {
        this.radius = 1;
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

    constructor(scene, method, type, font, camera, renderer, requestId, showLabel, position, delay, color, country) {
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
        this.timeStamp = Date.now() + delay;
        this.status = 'WAIT'
        this.requestId = requestId;
        this.showLabel = showLabel;
        this.servicePos = position.servicePos
        this.angle = Math.random() * Math.PI * 2;//position.angle;
        this.radius = 0;//position.radius
        this.posZ = position.servicePos.z
        this.speed = this.totesRando(1, 9) / 100;
        this.randomDelay = delay;
        this.color = color;
        this.country = country;
        //get the position setup
        this.rotation = this.totesRando(1, 9) / 1000;

        //to move a particle toward the URL 
        this.location = new THREE.Vector3(position.servicePos.x, position.servicePos.y, position.servicePos.z);
        this.velocity = new THREE.Vector3(this.speed, this.speed, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.maxSpeed = new THREE.Vector3(this.speed, this.speed, 0);
        this.maxForce = new THREE.Vector3(0.00005, 0.00005, 0)

        this.target = new THREE.Vector3(0, 0, -0.20);

        this.size = this.totesRando(5, 15) / 100;
    }

    init() {


        let randomSize = this.totesRando(10, 15) / 1000
        this.geometry = new THREE.OctahedronGeometry(this.size, 0);
        this.material = new THREE.MeshPhongMaterial({ color: this.color });
        this.shape = new THREE.Mesh(this.geometry, this.material);


        //position of the shape
        this.shape.position.copy(this.servicePos)
        // const sparkle = this.totesRando(0.003, 0.5);
        this.shape.scale.set(0, 0, 0);
        TweenMax.to(this.shape.scale, {
            duration: 0.5,
            x: 1,
            y: 1,
            z: 1,
            yoyo: true,
            delay: this.randomDelay
        });
        this.scene.add(this.shape);


    }

    totesRando(max, min) {
        return Math.floor(Math.random() * (1 + max - min) + min)
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
            0
        );
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
        const dist = this.shape.position.distanceTo(this.target)

        this.seek();
        //update velocity

        this.velocity.add(this.acceleration);
        //limit speed
        this.velocity.min(this.maxSpeed)
        this.location.add(this.velocity)

        this.acceleration.multiply(new THREE.Vector3())

        this.shape.position.copy(this.location)
        this.shape.rotateX(this.rotation)
        this.shape.rotateY(this.rotation)
        this.shape.rotateZ(this.rotation)


        //old movement
        // this.radius += (this.speed * this.direction);
        // this.shape.position.copy(this.getCircularPosition(this.angle, this.radius, this.posZ))

        //CHECK STATE

        if (Date.now() > this.timeStamp || dist < 0.5) this.changeStatus();


    }

    seek() {



        let desired = this.target.sub(this.location);  // A vector pointing from the position to the target
        desired.normalize();
        desired.multiply(this.maxSpeed)

        desired.setZ(0);

        // Steering = Desired minus velocity
        let steer = desired.sub(this.velocity);

        steer.min(this.maxForce);  // Limit to maximum steering force

        this.applyForce(steer);
    }


    applyForce(force) {
        // We could add mass here if we want A = F / M

        this.acceleration.add(force);

    }

    setOut() {
        this.status = "TWEENOUT";
        this.timeStamp = Date.now() + 300;
        // //ADD TWEEN
        TweenMax.to(this.shape.scale, {
            duration: 0.3,
            x: 0,
            y: 0,
            z: 0,
            ease: "expo",
        });

    }

    changeStatus() {

        if (this.status == 'WAIT') {
            this.status = "ACTIVE"
            // this.timeStamp = Date.now() + this.totesRando(1, 4) * 1000
            this.timeStamp = Date.now() + 5 * 1000
        } else if (this.status == 'ACTIVE') {
            this.status = "TWEENOUT";
            this.timeStamp = Date.now() + 300;
            // //ADD TWEEN
            TweenMax.to(this.shape.scale, {
                duration: 0.3,
                x: 0,
                y: 0,
                z: 0,
                ease: "expo",
            });
        } else if (this.status == "TWEENOUT") {

            this.status = "REMOVE"
        }

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

    constructor(scene, method, type, font, camera, renderer, requestId, anglePos, zPos, showLabel, radius, idle) {
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
        this.status = 'TWEENIN'
        this.requestId = requestId;
        this.anglePos = anglePos;
        this.radius = radius;
        this.zPos = zPos;
        this.showLabel = showLabel;
        this.packagesNum = 0;
        this.speed = this.totesRando(3, 10) / 1000;
        this.randomDelay = this.totesRando(1, 8) / 10;
        this.rotation = this.totesRando(1, 9) / 1000;
        this.idle = idle

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
            0
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
        const newColor = this.idle ? 0x6A82FB : 0xA9A9A9;
        this.geometry = new THREE.DodecahedronBufferGeometry(0.3);
        this.material = new THREE.MeshPhongMaterial({ color: newColor });
        this.shape = new THREE.Mesh(this.geometry, this.material);
        this.shape.castShadow = true;
        this.shape.recieveShadow = true;

        this.shape.scale.set(0, 0, 0);

        const randomPos = this.getCircularPosition(this.anglePos);
        this.shape.position.copy(randomPos)

        TweenMax.to(this.shape.scale, {
            duration: 0.5,
            x: 1,
            y: 1,
            z: 1,
            ease: "expo",
            delay: this.randomDelay
        });

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

        const dist = this.shape.position.distanceTo(new THREE.Vector3(0, 0, 0))

        // this.shape.position.x = this.shape.position.x + (0.005 * this.direction);
        if (this.showLabel) this.updateText();
        //CHECK STATE
        if (Date.now() > this.timeStamp) {

            this.changeStatus();
        }
        this.radius += dist > 8 ? 0 : this.speed;
        this.shape.position.copy(this.getCircularPosition(this.anglePos))

        this.shape.rotateX(this.rotation)
        this.shape.rotateY(this.rotation)
        this.shape.rotateZ(this.rotation)

        //check if it has enough packages to display label
        if (this.packagesNum > 3 && !this.showLabel) {
            //change showlabel status
            this.showLabel = true;
            //add div
            this.elem = document.createElement('div');
            this.elem.classList.add("service-text");
            this.methEl = document.createElement('div');
            this.elem.textContent = this.type;
            this.methEl.textContent = this.method;
            this.labelContainerElem.appendChild(this.elem);
        }
    }

    setOut() {
        this.status = "TWEENOUT";
        this.timeStamp = Date.now() + 300;
        // //ADD TWEEN
        TweenMax.to(this.shape.scale, {
            duration: 0.3,
            x: 0,
            y: 0,
            z: 0,
            ease: "expo",
        });

    }

    changeStatus() {

        if (this.status == "TWEENIN") {
            this.status = "ACTIVE";

        } else if (this.status == "ACTIVE") {
            this.status = "TWEENOUT";
            this.timeStamp = Date.now() + 310;
            // //ADD TWEEN
            TweenMax.to(this.shape.scale, {
                duration: 0.3,
                x: 0,
                y: 0,
                z: 0,
                ease: "expo",
            });

        } else if (this.status == "TWEENOUT") {
            this.status = "REMOVE";
        }
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
        this.elem.style.transform = `translate(20%, -50%) translate(${x}px,${y}px)`;
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
        this.idle = true;

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

    isIdle(inStatus) {
        this.idle = inStatus;
        //change its color
        this.changeColor();
    }

    changeColor() {
        //red or gray
        const newColor = this.idle ? 0xee4035 : 0x909090;
        this.shape.material.color.setHex(newColor);
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


        this.geometry = new THREE.DodecahedronBufferGeometry(0.4);
        this.material = new THREE.MeshPhongMaterial({ color: 0xee4035 });
        this.shape = new THREE.Mesh(this.geometry, this.material);

        this.scene.add(this.shape);

        this.elem = document.createElement('div');
        this.elem.classList.add("url-text");
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
        this.shape.rotateX(-0.001)
        this.shape.rotateY(-0.001)
        // this.shape.rotateZ(0.01)

    }

    setLabel(name) {
        this.type = name
        this.elem.textContent = name;
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


