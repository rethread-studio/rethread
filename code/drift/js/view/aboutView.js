
export default class AboutView {
    constructor(container) {

        this.container = document.getElementById(container);

    }

    render() {
        const content = `
        <div class="flex flex-col m-auto  w-4/5">
            <div class="grid grid-cols-1 md:grid-cols-2 p-0 md:p-24 pt-28 md:pt-40">
                <div class="p-0 md:pr-20 hidden md:block">
                    <img class="h-auto .max-727 blur" src="./img/imgTest.png" alt="yahoo profile test">
                </div>
                <div class="container white  mt-4 md:mt-0">
                    <h1 class= "text-center md:text-left text-4xl md:text-8xl mb-6 md:mb-12" >About<br> re|thread</h1>
                    <p>re|thread is an open collective of computer scientists, artists, and designers, in Stockholm (Sweden). Our work lies at the intersection between software technology, art, interaction design, sonification, and visualization, and focuses on the use of software as the material and medium for artistic creation. Our work is fueled by the interest to explore the dynamic nature of software from multiple perspectives, addressing its many layers; from the sublimity and detail of each execution to the societal and political impact it has on our lives.</p>
                    </div>
            </div>
        <h2 class= "text-3xl mt-6 md:mt-0 mb-6 md:mb-12 text-center white" >Who we are</h2>
       <div class="flex flex-col md:flex-row justify-center content-center">
         <div class="flex flex-col  md:w-1/4 mt-6 md:mt-0 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/benoit1.png" alt="Benoit" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Benoit</h2> 
            <a href="https://softwarediversity.eu/" target="_blank" >
            <p>Professor in Software Technology<br>
            </p>   
             </a> 
            </div>
        </div>
        
        <div class="flex flex-col  md:w-1/4 mt-6 md:mt-0 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/thomas1.png" alt="Thomas" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Thomas</h2> 
            <a href="https://durieux.me/" target="_blank" >
            <p>Postdoc in Software Engineering<br>
            </p>   
             </a> 
            </div>
        </div>

        <div class="flex flex-col  md:w-1/4 mt-6 md:mt-0 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/erik1.png" alt="Erik" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Erik</h2> 
            <a href="https://eriknatanael.com/" target="_blank" >
            <p>Artist, musician, audiovisual composer<br>
             </p>   
             </a> 
            </div>
        </div>

        <div class="flex flex-col  md:w-1/4 mt-6 md:mt-0 text-center content-center">
            <div class="flex flex-wrap justify-center">
                <img src="../img/jonathan.jpg" alt="Jonathan" class="shadow rounded-full max-w-full h-auto align-middle border-none" />
            </div>
            <div class="container white  ">
            <h3 class="mt-5">Jonathan</h2> 
            <a href="https://www.ramirezjonathan.com/" target="_blank" >
            <p>Interaction designer and researcher<br>
            </p>   
             </a> 
            </div>
        </div>        
       </div>
       <h2 class= "text-3xl mb-6 md:mb-12 text-center white mt-6 md:mt-20" >Acknowledgments</h2>
       <div class="flex flex-row justify-center content-center mb-6 md:mb-10 space-x-10">
         <img src="../img/kth_logo.png" alt="KTH" class=" object-contain w-1/6 h-auto align-middle border-none" />
        <img src="../img/wasp_logo.png" alt="WASP" class=" object-contain w-1/6 h-auto align-middle border-none" />
        <img src="../img/castor.png" alt="Castor" class=" object-contain w-1/6 h-auto align-middle border-none" />
       </div>

       
       </div>

       `;
        this.container.innerHTML = content;

    }

}
