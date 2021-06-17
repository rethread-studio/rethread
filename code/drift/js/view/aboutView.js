
export default class AboutView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        const content = `
        <div class="grid grid-cols-2 p-24 pt-40">
            <div class="pr-20 ">
             <img class="h-auto .max-727 blur" src="./img/imgTest.png" alt="yahoo profile test">
            </div>
            <div class="container white  ">
                <h1 class= "text-8xl mb-12" >About<br> re|thread</h1>
                <p>re|thread is an open collective of computer scientists, artists, and designers, in Stockholm (Sweden). Our work lies at the intersection between software technology, art, interaction design, sonification, and visualization, and focuses on the use of software as the material and medium for artistic creation. Our work is fueled by the interest to explore the dynamic nature of software from multiple perspectives, addressing its many layers; from the sublimity and detail of each execution to the societal and political impact it has on our lives.</p>
                </div>
        </div>
        <h2 class= "text-3xl mb-12 text-center white" >Who we are</h2>
       <div class="flex flex-row justify-center content-center">
         <div class="flex flex-col w-1/4 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/benoit1.png" alt="Benoit" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Benoit</h2> 
            <p>Professor in Software Technology<br>
             <a href="https://softwarediversity.eu/" target="_blank" >Website</a> </p>   
            </div>
        </div>
        
        <div class="flex flex-col w-1/4 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/thomas1.png" alt="Thomas" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Thomas</h2> 
            <p>Postdoc in Software Engineering<br>
             <a href="https://durieux.me/" target="_blank" >Website</a> </p>   
            </div>
        </div>

        <div class="flex flex-col w-1/4 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/erik1.png" alt="Erik" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Erik</h2> 
            <p>Artist, musician, audiovisual composer<br>
             <a href="https://eriknatanael.com/" target="_blank" >Website</a> </p>   
            </div>
        </div>

        <div class="flex flex-col w-1/4 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/jonathan.jpg" alt="Jonathan" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Jonathan</h2> 
            <p>Interaction designer and researcher<br>
             <a href="https://www.ramirezjonathan.com/" target="_blank" >Website</a> </p>   
            </div>
        </div>        
       </div>
       <h2 class= "text-3xl mb-12 text-center white mt-20" >Acknowledgments</h2>
       <div class="flex flex-row justify-center content-center mb-10 space-x-10">
       <img src="../img/kth_logo.png" alt="KTH" class=" object-contain w-1/6 h-auto align-middle border-none" />
       <img src="../img/wasp_logo.png" alt="WASP" class=" object-contain w-1/6 h-auto align-middle border-none" />
       <img src="../img/castor.png" alt="Castor" class=" object-contain w-1/6 h-auto align-middle border-none" />
       
       </div>

       <div class="flex flex-row justify-center content-center mb-40 space-x-10 white">
        <p>Lorem ipsum - Lorem ipsum - Lorem ipsum - Lorem ipsum - Lorem ipsum</p>
       </div>

       `;
        this.container.innerHTML = content;

    }

}
